"use strict";

const { PrismaClient } = require("@prisma/client");
const changes = require("./enhe-content-reaudit-20261121.json");

const allowedFields = {
  tool: ["coverImage", "name", "englishName", "categoryId", "shortDescription", "valueProposition", "englishValueProposition"],
  toolCategory: ["name", "type", "status", "sortOrder", "description"],
  aiWorkflowTopic: ["slug", "name", "englishName", "isEnabled", "sortOrder", "searchDirections"],
  aiWorkflowCandidate: ["projectType", "topicId"],
  toolPriceSpec: ["name"],
  toolFaq: ["question", "answer"],
  newsCategory: ["name"],
};
const scopes = {
  tool: ["slug", "type", "status"],
  toolCategory: [],
  aiWorkflowTopic: [],
  aiWorkflowCandidate: ["repositoryName", "toolId"],
  toolPriceSpec: ["toolId", "status"],
  toolFaq: ["toolId", "status"],
  newsCategory: ["slug", "status"],
};
function sameValues(record, values) {
  return values === null ? record === null : record && Object.entries(values).every(([key, value]) => record[key] === value);
}
async function runContentAudit(db, mode = "--check") {
  if (!["--check", "--apply", "--check-rollback", "--rollback"].includes(mode)) throw Error("Unknown operation");
  const writing = mode === "--apply" || mode === "--rollback";
  const reverse = mode.includes("rollback");
  const ordered = reverse ? [...changes].reverse() : changes;
  return db.$transaction(async (tx) => {
    if (!writing) await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    const receipt = { mode, inspected: 0, alreadyAtTarget: 0, pending: 0, written: 0, records: [] };
    for (const { model, id, scope, before, after, ref } of ordered) {
      const allowed = allowedFields[model];
      const fields = Object.keys(after);
      const scopeKeys = Object.keys(scope).sort();
      if (!allowed || !id || !fields.length || fields.some((key) => !allowed.includes(key))
        || JSON.stringify(scopeKeys) !== JSON.stringify([...scopes[model]].sort())
        || (before && JSON.stringify(Object.keys(before).sort()) !== JSON.stringify([...fields].sort()))
        || (!before && !["toolCategory", "aiWorkflowTopic"].includes(model))) throw Error("Invalid content manifest at " + id);
      const select = Object.fromEntries(["id", ...fields, ...scopeKeys].map((key) => [key, true]));
      const record = await tx[model].findUnique({ where: { id }, select });
      const expected = reverse ? after : before;
      const target = reverse ? before : after;
      const identity = model + "/" + id;
      receipt.inspected++;
      if (record && !sameValues(record, scope)) throw Error("Identity or publication state changed at " + identity);
      if (sameValues(record, target)) {
        receipt.alreadyAtTarget++;
        receipt.records.push({ ref, identity, state: "at_target" });
        continue;
      }
      if (!sameValues(record, expected)) throw Error("Public content changed since the audit at " + identity);
      if (!expected) {
        const naturalKey = model === "toolCategory" ? { type: target.type, name: target.name } : { OR: [{ slug: target.slug }, { name: target.name }] };
        if (await tx[model].findFirst({ where: naturalKey, select: { id: true } })) throw Error("Category identity conflict at " + identity);
      }
      receipt.pending++;
      if (writing) {
        if (!expected) {
          await tx[model].create({ data: { id, ...target }, select: { id: true } });
        } else if (!target) {
          const unused = model === "toolCategory" ? { tools: { none: {} } } : { candidates: { none: {} }, batches: { none: {} } };
          const result = await tx[model].deleteMany({ where: { id, ...expected, ...unused } });
          if (result.count !== 1) throw Error("Created category changed or has new references at " + identity);
        } else {
          const result = await tx[model].updateMany({ where: { id, ...scope, ...expected }, data: target });
          if (result.count !== 1) throw Error("Concurrent edit at " + identity);
        }
        receipt.written++;
      }
      receipt.records.push({ ref, identity, state: writing ? "written" : "pending" });
    }
    return receipt;
  }, { isolationLevel: "Serializable", timeout: 60000 });
}
if (require.main === module) {
  const db = new PrismaClient();
  if (process.argv.length > 3) throw Error("Expected a single operation");
  runContentAudit(db, process.argv[2]).then((result) => console.log(JSON.stringify(result)))
    .catch((error) => { console.error(error.message); process.exitCode = 1; })
    .finally(() => db.$disconnect());
}
module.exports = { runContentAudit };
