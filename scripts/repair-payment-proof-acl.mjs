import { createHash } from "node:crypto";
import { mkdir, open } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Dry-run by default. This script never downloads objects, edits database rows, or lists the bucket.
export function paymentProofKey(source, bucket, region) {
  if (typeof source !== "string") return null;
  let key;
  const cos = /^cos:\/\/([^/]+)\/(.+)$/.exec(source);
  if (cos) {
    if (cos[1] !== bucket) return null;
    key = cos[2];
  } else {
    try {
      const url = new URL(source);
      if (url.protocol !== "https:" || url.username || url.password || ![
        `${bucket}.cos.${region}.myqcloud.com`, `${bucket}.cos.${region}.tencentcos.cn`
      ].includes(url.hostname)) return null;
      key = decodeURIComponent(url.pathname.slice(1));
    } catch { return null; }
  }
  return /^payment-proofs\/[a-zA-Z0-9_-][a-zA-Z0-9._-]*\.(png|jpe?g|webp|gif)$/i.test(key) ? key : null;
}

export function isOwnerOnlyAcl(acl) {
  if (acl.ACL !== "private") return false;
  return (acl.Grants ?? []).every((grant) => grant.Grantee?.ID === acl.Owner?.ID && !grant.Grantee?.URI);
}

function request(cos, method, params) {
  return new Promise((resolveRequest, reject) => cos[method](params, (error, result) => error ? reject(error) : resolveRequest(result)));
}

export async function anonymousProofAccess({ bucket, region, key }) {
  try {
    const url = `https://${bucket}.cos.${region}.myqcloud.com/${key.split("/").map(encodeURIComponent).join("/")}`;
    const response = await fetch(url, { method: "HEAD", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (response.status === 403 || response.status === 404) return "denied";
    if (response.status >= 200 && response.status < 300) return "public";
    return "unknown";
  } catch { return "unknown"; }
}

export async function repairPaymentProofAcls({ prisma, cos, bucket, region, apply = false, backup, verifyAnonymous = apply, anonymousHead = anonymousProofAccess }) {
  if (apply && !backup) throw new Error("ACL_BACKUP_REQUIRED");
  const rows = await prisma.paymentProof.findMany({ select: { proofImage: true } });
  const report = { mode: apply ? "apply" : "dry-run", references: rows.length, eligibleObjects: 0, rejectedReferences: 0, alreadyPrivate: 0, wouldChange: 0, updated: 0, verified: 0, missing: 0, failed: 0, anonymousDenied: 0, anonymousPublic: 0, anonymousUnknown: 0, objects: [] };
  const keys = new Set();
  for (const { proofImage } of rows) {
    const key = paymentProofKey(proofImage, bucket, region);
    if (key) keys.add(key);
    else report.rejectedReferences += 1;
  }
  report.eligibleObjects = keys.size;

  for (const key of keys) {
    const item = { objectHash: createHash("sha256").update(key).digest("hex"), status: "pending", anonymous: "not-checked" };
    report.objects.push(item);
    const params = { Bucket: bucket, Region: region, Key: key };
    try {
      const original = await request(cos, "getObjectAcl", params);
      if (isOwnerOnlyAcl(original)) {
        report.alreadyPrivate += 1;
        item.status = "already-private";
      } else {
        report.wouldChange += 1;
        if (!apply) {
          item.status = "would-set-private";
        } else {
          // Persist rollback information before any ACL write. It is never printed or committed.
          await backup({ bucket, region, key, acl: Object.fromEntries(["ACL", "GrantRead", "GrantReadAcp", "GrantWriteAcp", "GrantFullControl", "Owner", "Grants"].map((field) => [field, original[field]])) });
          await request(cos, "putObjectAcl", { ...params, ACL: "private" });
          report.updated += 1;
          const current = await request(cos, "getObjectAcl", params);
          if (!isOwnerOnlyAcl(current)) throw new Error("ACL_VERIFICATION_FAILED");
          report.verified += 1;
          item.status = "verified-private";
        }
      }
      if (verifyAnonymous) {
        let access;
        try { access = await anonymousHead({ bucket, region, key }); } catch { access = "unknown"; }
        item.anonymous = access === "denied" || access === "public" ? access : "unknown";
        if (item.anonymous === "denied") report.anonymousDenied += 1;
        else if (item.anonymous === "public") report.anonymousPublic += 1;
        else report.anonymousUnknown += 1;
      }
    } catch (error) {
      if (error?.statusCode === 404 || error?.code === "NoSuchKey") {
        report.missing += 1;
        item.status = "object-missing";
      } else {
        report.failed += 1;
        item.status = "failed";
      }
    }
  }
  return report;
}

export function aclReportNeedsAttention(report) {
  return Boolean(report.failed || report.rejectedReferences || report.missing || report.anonymousPublic || report.anonymousUnknown);
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const backupArg = args.find((arg) => arg.startsWith("--backup-file="))?.slice("--backup-file=".length);
  if (args.some((arg) => arg !== "--apply" && arg !== "--dry-run" && arg !== "--verify-anonymous" && !arg.startsWith("--backup-file="))) throw new Error("INVALID_ARGUMENTS");
  if (apply && args.includes("--dry-run")) throw new Error("CONFLICTING_MODE");
  if (apply && (!backupArg || !isAbsolute(backupArg))) throw new Error("ABSOLUTE_BACKUP_FILE_REQUIRED");
  const required = ["DATABASE_URL", "TENCENT_COS_SECRET_ID", "TENCENT_COS_SECRET_KEY", "TENCENT_COS_BUCKET", "TENCENT_COS_REGION"];
  if (required.some((key) => !process.env[key]?.trim())) throw new Error("CONFIGURATION_INCOMPLETE");
  const { PrismaClient } = await import("@prisma/client");
  const { default: COS } = await import("cos-nodejs-sdk-v5");
  const prisma = new PrismaClient();
  const cos = new COS({ SecretId: process.env.TENCENT_COS_SECRET_ID, SecretKey: process.env.TENCENT_COS_SECRET_KEY, Timeout: 15_000 });
  let backupFile;
  try {
    if (apply) {
      const directory = dirname(backupArg);
      await mkdir(directory, { recursive: true, mode: 0o700 });
      backupFile = await open(backupArg, "wx", 0o600);
    }
    const report = await repairPaymentProofAcls({
      prisma, cos, bucket: process.env.TENCENT_COS_BUCKET.trim(), region: process.env.TENCENT_COS_REGION.trim(), apply,
      verifyAnonymous: apply || args.includes("--verify-anonymous"),
      backup: backupFile ? async (record) => {
        await backupFile.writeFile(`${JSON.stringify({ recordedAt: new Date().toISOString(), ...record })}\n`);
        await backupFile.sync();
      } : undefined
    });
    console.log(JSON.stringify(report));
    if (aclReportNeedsAttention(report)) process.exitCode = 1;
  } finally {
    await backupFile?.close();
    await prisma.$disconnect();
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(() => { console.error(JSON.stringify({ status: "failed", message: "ACL repair did not complete. Check configuration, permission, and the protected rollback file; no sensitive error details were printed." })); process.exitCode = 1; });
}
