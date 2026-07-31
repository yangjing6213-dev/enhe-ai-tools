import { randomBytes } from "node:crypto";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(import.meta.dirname, "..");
const temporaryRoot = mkdtempSync(join(tmpdir(), "enhe-migration-drill-"));
const mainWorktree = join(temporaryRoot, "origin-main");
const containerName = `enhe-migration-drill-${process.pid}-${Date.now()}`;
const postgresPassword = randomBytes(24).toString("hex");
const prismaCli = join(repoRoot, "node_modules", "prisma", "build", "index.js");
let containerStarted = false;
let worktreeAdded = false;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    env: options.env ? { ...process.env, ...options.env } : process.env,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = options.capture ? (result.stderr || result.stdout || "").trim() : "";
    throw new Error(`${command} failed with exit code ${result.status}${detail ? `: ${detail}` : ""}`);
  }
  return options.capture ? result.stdout.trim() : "";
}

function sleep(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function databaseUrl(port, database) {
  return `postgresql://codex:${postgresPassword}@127.0.0.1:${port}/${database}?schema=public`;
}

function migrate(schema, url) {
  run(process.execPath, [prismaCli, "migrate", "deploy", "--schema", schema], {
    env: { DATABASE_URL: url },
  });
}

function assertNoSchemaDrift(schema, url) {
  run(process.execPath, [
    prismaCli,
    "migrate",
    "diff",
    "--from-url",
    url,
    "--to-schema-datamodel",
    schema,
    "--exit-code",
  ]);
}

try {
  run("docker", [
    "run",
    "-d",
    "--rm",
    "--name",
    containerName,
    "-e",
    `POSTGRES_PASSWORD=${postgresPassword}`,
    "-e",
    "POSTGRES_USER=codex",
    "-e",
    "POSTGRES_DB=postgres",
    "-p",
    "127.0.0.1::5432",
    "postgres:16-alpine",
  ], { capture: true });
  containerStarted = true;

  let ready = false;
  for (let attempt = 0; attempt < 45; attempt += 1) {
    const result = spawnSync("docker", [
      "exec",
      containerName,
      "pg_isready",
      "-U",
      "codex",
      "-d",
      "postgres",
    ], { stdio: "ignore" });
    if (result.status === 0) {
      ready = true;
      break;
    }
    sleep(1000);
  }
  if (!ready) throw new Error("Migration drill PostgreSQL container did not become ready.");

  const portOutput = run("docker", ["port", containerName, "5432/tcp"], { capture: true });
  const portMatch = portOutput.match(/127\.0\.0\.1:(\d+)/);
  if (!portMatch) throw new Error("Could not resolve the migration drill PostgreSQL port.");
  const port = portMatch[1];

  for (const database of ["migration_fresh", "migration_upgrade"]) {
    run("docker", ["exec", containerName, "createdb", "-U", "codex", database]);
  }

  const currentSchema = join(repoRoot, "prisma", "schema.prisma");
  const freshUrl = databaseUrl(port, "migration_fresh");
  migrate(currentSchema, freshUrl);
  run(process.execPath, [prismaCli, "migrate", "status", "--schema", currentSchema], {
    env: { DATABASE_URL: freshUrl },
  });
  assertNoSchemaDrift(currentSchema, freshUrl);

  run("git", ["worktree", "add", "--detach", mainWorktree, "origin/main"]);
  worktreeAdded = true;
  const mainSchema = join(mainWorktree, "prisma", "schema.prisma");
  if (!existsSync(mainSchema)) throw new Error("origin/main does not contain prisma/schema.prisma.");

  const upgradeUrl = databaseUrl(port, "migration_upgrade");
  migrate(mainSchema, upgradeUrl);
  migrate(currentSchema, upgradeUrl);
  run(process.execPath, [prismaCli, "migrate", "status", "--schema", currentSchema], {
    env: { DATABASE_URL: upgradeUrl },
  });
  assertNoSchemaDrift(currentSchema, upgradeUrl);

  console.log("Fresh and origin/main upgrade migration paths passed.");
} finally {
  if (worktreeAdded) {
    spawnSync("git", ["worktree", "remove", "--force", mainWorktree], {
      cwd: repoRoot,
      stdio: "ignore",
    });
  }
  if (containerStarted) {
    spawnSync("docker", ["rm", "-f", containerName], { stdio: "ignore" });
  }
  rmSync(temporaryRoot, { recursive: true, force: true });
}
