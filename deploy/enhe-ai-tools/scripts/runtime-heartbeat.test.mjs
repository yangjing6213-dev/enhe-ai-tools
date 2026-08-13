import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { promises as fs } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const releaseRef = "a".repeat(40);
const children = [];
const servers = [];
const temporaryDirectories = [];

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function createTemporaryDirectory() {
  const directory = await fs.mkdtemp(join(tmpdir(), "enhe-runtime-heartbeat-"));
  temporaryDirectories.push(directory);
  return directory;
}

function startScript(name, env, cwd) {
  const child = spawn(process.execPath, [join(scriptsDir, name)], {
    cwd,
    env,
    stdio: "ignore"
  });
  children.push(child);
  return child;
}

async function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, "exit");
  child.kill();
  await Promise.race([exited, delay(5_000)]);
}

async function waitForExitCode(child, timeoutMs = 750) {
  return Promise.race([
    once(child, "exit").then(([code]) => code),
    delay(timeoutMs).then(() => null)
  ]);
}

async function waitForJsonFile(path, timeoutMs = 3_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      return JSON.parse(await fs.readFile(path, "utf8"));
    } catch {
      await delay(25);
    }
  }
  throw new Error(`JSON file was not written: ${path}`);
}

async function waitForJsonFileMatching(path, predicate, timeoutMs = 3_000) {
  const deadline = Date.now() + timeoutMs;
  let latest = null;
  while (Date.now() < deadline) {
    try {
      latest = JSON.parse(await fs.readFile(path, "utf8"));
      if (predicate(latest)) return latest;
    } catch {
      // The heartbeat writer replaces the file atomically, so retry transient reads.
    }
    await delay(25);
  }
  return latest;
}

async function startSchedulerServer() {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true }));
  });
  servers.push(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing server address");
  return `http://127.0.0.1:${address.port}`;
}

async function startWorkerServer() {
  let jobAvailable = true;
  const server = createServer((request, response) => {
    const job = jobAvailable
      ? {
          id: "environment-test-job",
          leaseToken: "environment-test-lease",
          targetUrl: "https://example.com",
          pageLimit: 1,
          requestTimeoutSeconds: 5,
          totalTimeoutSeconds: 10,
          engineVersion: "test"
        }
      : null;
    const body = request.url?.endsWith("/claim")
      ? { ok: true, job }
      : { ok: true, cancelRequested: false };
    if (request.url?.endsWith("/claim")) jobAvailable = false;
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(body));
  });
  servers.push(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing server address");
  return `http://127.0.0.1:${address.port}`;
}

async function installPythonShim(directory) {
  const binDirectory = join(directory, "bin");
  const pythonPath = join(
    binDirectory,
    process.platform === "win32" ? "python3.exe" : "python3"
  );
  await fs.mkdir(binDirectory);
  if (process.platform === "win32") {
    await fs.copyFile(process.execPath, pythonPath);
  } else {
    await fs.symlink(process.execPath, pythonPath);
  }
  return binDirectory;
}

async function workerEnvironment({
  includeReleaseRef = true,
  baseUrl = "http://127.0.0.1:9",
  engine = "print('review fixture')\n",
  engineName = "site_audit.py"
} = {}) {
  const directory = await createTemporaryDirectory();
  const enginePath = join(directory, engineName);
  await fs.writeFile(enginePath, engine, "utf8");
  const env = {
    ...process.env,
    NODE_ENV: "production",
    SEO_AUDIT_INTERNAL_BASE_URL: baseUrl,
    AUDIT_WORKER_TOKEN_CURRENT: "test-worker-token-1234567890",
    SEO_AUDIT_ENGINE_PATH: enginePath,
    SEO_AUDIT_ENGINE_SHA256: createHash("sha256").update(engine).digest("hex"),
    SEO_AUDIT_ENGINE_VERSION: "test",
    SEO_AUDIT_WORKER_HEARTBEAT_FILE: join(directory, "worker.json"),
    SEO_AUDIT_WORKER_POLL_MS: "1000"
  };
  if (includeReleaseRef) env.RELEASE_REF = releaseRef;
  else delete env.RELEASE_REF;
  return env;
}

async function schedulerEnvironment({ includeReleaseRef = true } = {}) {
  const directory = await createTemporaryDirectory();
  const env = {
    ...process.env,
    NODE_ENV: "production",
    SEO_AUDIT_INTERNAL_BASE_URL: await startSchedulerServer(),
    AUDIT_WORKER_TOKEN_CURRENT: "test-worker-token-1234567890",
    SEO_AUDIT_SCHEDULER_HEARTBEAT_FILE: join(directory, "scheduler.json"),
    SEO_AUDIT_SCHEDULER_INTERVAL_MS: "1000"
  };
  if (includeReleaseRef) env.RELEASE_REF = releaseRef;
  else delete env.RELEASE_REF;
  return env;
}

afterEach(async () => {
  await Promise.all(children.splice(0).map(stopChild));
  await Promise.all(
    servers.splice(0).map(
      (server) => new Promise((resolve) => server.close(resolve))
    )
  );
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      fs.rm(directory, {
        recursive: true,
        force: true,
        maxRetries: 20,
        retryDelay: 100
      })
    )
  );
});

describe("SEO audit runtime heartbeat identity", () => {
  it("writes worker release identity and a stable process start time", async () => {
    const env = await workerEnvironment({ baseUrl: await startSchedulerServer() });
    const child = startScript("seo-audit-worker.mjs", env);
    const heartbeat = await waitForJsonFileMatching(
      env.SEO_AUDIT_WORKER_HEARTBEAT_FILE,
      (value) => value.status === "ok" && value.releaseRef === releaseRef
    );

    expect(heartbeat).toMatchObject({ releaseRef, status: "ok" });
    expect(Date.parse(heartbeat.startedAt)).not.toBeNaN();
    expect(Date.parse(heartbeat.checkedAt)).toBeGreaterThanOrEqual(
      Date.parse(heartbeat.startedAt)
    );
    await stopChild(child);
  });

  it("writes scheduler release identity and a stable process start time", async () => {
    const env = await schedulerEnvironment();
    const child = startScript("seo-audit-scheduler.mjs", env);
    const heartbeat = await waitForJsonFile(env.SEO_AUDIT_SCHEDULER_HEARTBEAT_FILE);

    expect(heartbeat).toMatchObject({ releaseRef, status: "ok" });
    expect(Date.parse(heartbeat.startedAt)).not.toBeNaN();
    expect(Date.parse(heartbeat.checkedAt)).toBeGreaterThanOrEqual(
      Date.parse(heartbeat.startedAt)
    );
    await stopChild(child);
  });

  it.each([
    ["worker", "seo-audit-worker.mjs", workerEnvironment],
    ["scheduler", "seo-audit-scheduler.mjs", schedulerEnvironment]
  ])("fails closed when the %s production process has no RELEASE_REF", async (
    _label,
    script,
    environmentFactory
  ) => {
    const env = await environmentFactory({ includeReleaseRef: false });
    const child = startScript(script, env);

    expect(await waitForExitCode(child)).toBe(1);
  });

  it("starts python3 without inheriting worker secrets", async () => {
    const directory = await createTemporaryDirectory();
    const environmentPath = join(directory, "engine-environment.json");
    const pythonPath = await installPythonShim(directory);
    const engine = [
      'const { writeFileSync } = require("node:fs");',
      `writeFileSync(${JSON.stringify(environmentPath)}, JSON.stringify(process.env));`
    ].join("\n");
    const env = await workerEnvironment({
      baseUrl: await startWorkerServer(),
      engine,
      engineName: "site_audit.cjs"
    });
    for (const name of Object.keys(env)) {
      if (name.toUpperCase() === "PATH") delete env[name];
    }
    Object.assign(env, {
      PATH: pythonPath,
      HOME: join(directory, "home"),
      LANG: "C.UTF-8",
      TEMP: directory,
      TMP: directory,
      TMPDIR: directory,
      SEO_AUDIT_ANONYMOUS_HMAC_SECRET: "anonymous-hmac-secret",
      ZPAY_KEY: "payment-secret",
      DATABASE_URL: "postgresql://secret@database/audit",
      UNRELATED_DEPLOY_SECRET: "must-not-reach-engine"
    });
    const child = startScript("seo-audit-worker.mjs", env, pythonPath);

    const engineEnvironment = await waitForJsonFile(environmentPath, 10_000);

    expect(engineEnvironment).toMatchObject({
      PATH: pythonPath,
      PYTHONDONTWRITEBYTECODE: "1",
      HOME: env.HOME,
      LANG: env.LANG,
      TEMP: env.TEMP,
      TMP: env.TMP,
      TMPDIR: env.TMPDIR
    });
    for (const secretName of [
      "AUDIT_WORKER_TOKEN_CURRENT",
      "SEO_AUDIT_ANONYMOUS_HMAC_SECRET",
      "ZPAY_KEY",
      "DATABASE_URL",
      "UNRELATED_DEPLOY_SECRET"
    ]) {
      expect(engineEnvironment[secretName]).toBeUndefined();
    }
    await stopChild(child);
  });

});
