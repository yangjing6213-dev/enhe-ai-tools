import { randomBytes } from "node:crypto";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(import.meta.dirname, "..");
const migrationBaseBranch = process.argv[2];
if (!migrationBaseBranch) {
  throw new Error("Pass the explicitly selected release branch to the migration drill.");
}
const branchCheck = spawnSync("git", ["check-ref-format", "--branch", migrationBaseBranch], {
  cwd: repoRoot,
  encoding: "utf8",
  stdio: "ignore",
});
if (branchCheck.status !== 0) {
  throw new Error("The migration drill requires a valid Git branch name.");
}
const migrationBaseRef = `origin/${migrationBaseBranch}`;
const temporaryRoot = mkdtempSync(join(tmpdir(), "enhe-migration-drill-"));
const baseWorktree = join(temporaryRoot, "branch-base");
const containerName = `enhe-migration-drill-${process.pid}-${Date.now()}`;
const postgresPassword = randomBytes(24).toString("hex");
const prismaCli = join(repoRoot, "node_modules", "prisma", "build", "index.js");
const LOCAL_DOCKER_ENDPOINT_PATTERN =
  "^(?:unix:///(?!/).+|npipe:////\\./pipe/(?:docker_engine|dockerDesktopLinuxEngine)|npipe://\\./pipe/(?:docker_engine|dockerDesktopLinuxEngine))$";
let containerStarted = false;
let worktreeAdded = false;
let operationError;
let operationFailed = false;
const cleanupFailures = [];

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

function assertLocalDockerContext() {
  if (process.env.DOCKER_HOST?.trim()) {
    throw new Error("DOCKER_HOST overrides are not allowed for the migration drill.");
  }

  const contextName = run("docker", ["context", "show"], { capture: true });
  const endpoint = run(
    "docker",
    ["context", "inspect", contextName, "--format", "{{.Endpoints.docker.Host}}"],
    { capture: true },
  );
  if (!new RegExp(LOCAL_DOCKER_ENDPOINT_PATTERN, "i").test(endpoint)) {
    throw new Error("Docker endpoint must be a local named pipe or Unix socket; remote Docker contexts are not allowed.");
  }
}

function sleep(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function databaseUrl(port, database) {
  return `postgresql://codex:${postgresPassword}@127.0.0.1:${port}/${database}?schema=public`;
}

function localDatabaseEnvironment(url) {
  return { DATABASE_URL: url, DIRECT_URL: url };
}

function migrate(schema, url) {
  run(process.execPath, [prismaCli, "migrate", "deploy", "--schema", schema], {
    env: localDatabaseEnvironment(url),
  });
}

function assertMigrationStatus(schema, url) {
  run(process.execPath, [prismaCli, "migrate", "status", "--schema", schema], {
    env: localDatabaseEnvironment(url),
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
  ], { env: localDatabaseEnvironment(url) });
}

try {
  assertLocalDockerContext();
  run("docker", [
    "run",
    "-d",
    "--rm",
    "--pull=never",
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
  assertMigrationStatus(currentSchema, freshUrl);
  assertNoSchemaDrift(currentSchema, freshUrl);

  run("git", ["worktree", "add", "--detach", baseWorktree, migrationBaseRef]);
  worktreeAdded = true;
  const baseSchema = join(baseWorktree, "prisma", "schema.prisma");
  if (!existsSync(baseSchema)) throw new Error("The selected migration base does not contain prisma/schema.prisma.");

  const upgradeUrl = databaseUrl(port, "migration_upgrade");
  migrate(baseSchema, upgradeUrl);
  migrate(currentSchema, upgradeUrl);
  assertMigrationStatus(currentSchema, upgradeUrl);
  assertNoSchemaDrift(currentSchema, upgradeUrl);

} catch (error) {
  operationFailed = true;
  operationError = error;
} finally {
  if (worktreeAdded) {
    const cleanupResult = spawnSync("git", ["worktree", "remove", "--force", baseWorktree], {
      cwd: repoRoot,
      stdio: "ignore",
    });
    if (cleanupResult.error || cleanupResult.status !== 0) {
      cleanupFailures.push(
        cleanupResult.error ?? new Error(`git worktree remove exited with status ${cleanupResult.status}`),
      );
    }
  }
  if (containerStarted) {
    const cleanupResult = spawnSync("docker", ["rm", "-f", containerName], { stdio: "ignore" });
    if (cleanupResult.error || cleanupResult.status !== 0) {
      cleanupFailures.push(
        cleanupResult.error ?? new Error(`docker rm exited with status ${cleanupResult.status}`),
      );
    }
  }
  try {
    rmSync(temporaryRoot, { recursive: true, force: true });
  } catch (error) {
    cleanupFailures.push(error);
  }
}

const cleanupDetail = cleanupFailures
  .map((error) => (error instanceof Error ? error.message : String(error)))
  .join("; ");
if (operationFailed && cleanupFailures.length > 0) {
  throw new AggregateError(
    [operationError, ...cleanupFailures],
    `Migration drill failed and cleanup failed: ${cleanupDetail}`,
  );
}
if (operationFailed) throw operationError;
if (cleanupFailures.length > 0) {
  throw new AggregateError(cleanupFailures, `Migration drill cleanup failed: ${cleanupDetail}`);
}

console.log(`Fresh and ${migrationBaseRef} upgrade migration paths passed.`);
