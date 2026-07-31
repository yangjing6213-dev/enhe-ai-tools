import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import {
  loadRuntimeHeartbeatIdentity,
  writeRuntimeHeartbeat
} from "./runtime-heartbeat.mjs";

const MAX_BUNDLE_BYTES = 32 * 1024 * 1024;
const MAX_COMPRESSED_BYTES = 6 * 1024 * 1024;
const ENGINE_ENVIRONMENT_KEYS = [
  "HOME",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "PATH",
  "SYSTEMROOT",
  "TEMP",
  "TMP",
  "TMPDIR",
  "WINDIR"
];
const severityPenalty = { critical: 25, high: 15, medium: 7, low: 3, info: 0 };
let activeChild = null;
let stopping = false;

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function positiveInteger(name, fallback, minimum, maximum) {
  const value = Number(process.env[name] ?? fallback);
  if (
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new Error(`${name} is outside its allowed range`);
  }
  return value;
}

function loadConfig() {
  const baseUrl = new URL(required("SEO_AUDIT_INTERNAL_BASE_URL"));
  if (!/^https?:$/.test(baseUrl.protocol) || baseUrl.username || baseUrl.password) {
    throw new Error("SEO_AUDIT_INTERNAL_BASE_URL is invalid");
  }
  const workerId = process.env.SEO_AUDIT_WORKER_ID?.trim() || "enhe-worker-1";
  if (!/^[A-Za-z0-9._:-]{1,80}$/.test(workerId)) {
    throw new Error("SEO_AUDIT_WORKER_ID is invalid");
  }
  return {
    baseUrl: baseUrl.toString().replace(/\/$/, ""),
    token: required("AUDIT_WORKER_TOKEN_CURRENT"),
    enginePath: required("SEO_AUDIT_ENGINE_PATH"),
    engineSha256: required("SEO_AUDIT_ENGINE_SHA256").toLowerCase(),
    engineVersion: process.env.SEO_AUDIT_ENGINE_VERSION?.trim() || "1.4.8",
    workerId,
    heartbeatFile: required("SEO_AUDIT_WORKER_HEARTBEAT_FILE"),
    heartbeatIdentity: loadRuntimeHeartbeatIdentity(),
    pollMs: positiveInteger("SEO_AUDIT_WORKER_POLL_MS", 5_000, 1_000, 60_000)
  };
}

async function verifyEngine(config) {
  if (!/^[a-f0-9]{64}$/.test(config.engineSha256)) {
    throw new Error("SEO_AUDIT_ENGINE_SHA256 is invalid");
  }
  const engine = await fs.readFile(config.enginePath);
  const actual = createHash("sha256").update(engine).digest("hex");
  if (actual !== config.engineSha256) {
    throw new Error("SEO audit engine checksum mismatch");
  }
}

async function postJson(config, path, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${config.baseUrl}${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(body),
      redirect: "error",
      signal: controller.signal
    });
    if (!response.ok) throw new Error("WORKER_API_REQUEST_FAILED");
    const result = await response.json();
    if (!result || result.ok !== true) throw new Error("WORKER_API_REQUEST_FAILED");
    return result;
  } finally {
    clearTimeout(timeout);
  }
}

async function claimJob(config) {
  const result = await postJson(
    config,
    "/api/internal/seo-audit/jobs/claim",
    { workerId: config.workerId, engineVersion: config.engineVersion }
  );
  return result.job ?? null;
}

async function sendJobHeartbeat(config, job, phase, pagesProcessed = 0) {
  const result = await postJson(
    config,
    `/api/internal/seo-audit/jobs/${encodeURIComponent(job.id)}/heartbeat`,
    {
      leaseToken: job.leaseToken,
      workerId: config.workerId,
      engineVersion: config.engineVersion,
      progress: { phase, pagesProcessed, pageLimit: job.pageLimit }
    }
  );
  await writeRuntimeHeartbeat(config.heartbeatFile, config.heartbeatIdentity, {
    status: "ok",
    currentRunId: job.id
  });
  return result;
}

async function completeJob(config, job, reportGzipBase64, summary) {
  return postJson(
    config,
    `/api/internal/seo-audit/jobs/${encodeURIComponent(job.id)}/complete`,
    { leaseToken: job.leaseToken, reportGzipBase64, summary }
  );
}

async function failJob(config, job, failureCode) {
  try {
    await postJson(
      config,
      `/api/internal/seo-audit/jobs/${encodeURIComponent(job.id)}/fail`,
      { leaseToken: job.leaseToken, failureCode }
    );
  } catch {
    console.error("[seo-audit-worker] failed to report a stable job failure");
  }
}

function isClaimedJob(job, engineVersion) {
  return Boolean(
    job &&
      typeof job.id === "string" &&
      typeof job.leaseToken === "string" &&
      typeof job.targetUrl === "string" &&
      Number.isSafeInteger(job.pageLimit) &&
      Number.isSafeInteger(job.requestTimeoutSeconds) &&
      Number.isSafeInteger(job.totalTimeoutSeconds) &&
      job.engineVersion === engineVersion
  );
}

function deriveSummary(report) {
  if (
    !report ||
    !Array.isArray(report.pages) ||
    !Array.isArray(report.findings) ||
    !Array.isArray(report.strengths)
  ) {
    throw new Error("ARTIFACT_INVALID");
  }
  const verified = report.findings.filter(
    (finding) => finding && finding.status === "verified"
  );
  const score = Math.max(
    0,
    100 -
      verified.reduce((total, finding) => {
        const penalty = severityPenalty[finding.severity];
        if (penalty === undefined) throw new Error("ARTIFACT_INVALID");
        return total + penalty;
      }, 0)
  );
  const evidenceItems = report.strengths.length + verified.length;
  const evidenceTotal = report.strengths.length + report.findings.length;
  const count = (severity) =>
    verified.filter((finding) => finding.severity === severity).length;
  return {
    score,
    evidenceCoverage: evidenceTotal
      ? Math.round((evidenceItems * 100) / evidenceTotal)
      : 0,
    pageCount: report.pages.length,
    criticalCount: count("critical"),
    highCount: count("high"),
    mediumCount: count("medium")
  };
}

function terminateChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  const force = setTimeout(() => child.kill("SIGKILL"), 5_000);
  force.unref();
}

function buildEngineEnvironment() {
  const environment = { PYTHONDONTWRITEBYTECODE: "1" };
  for (const name of ENGINE_ENVIRONMENT_KEYS) {
    if (process.env[name] !== undefined) environment[name] = process.env[name];
  }
  return environment;
}

async function runEngine(config, job, jsonPath, markdownPath) {
  const child = spawn(
    "python3",
    [
      config.enginePath,
      job.targetUrl,
      "--max-pages",
      String(job.pageLimit),
      "--timeout",
      String(job.requestTimeoutSeconds),
      "--json-out",
      jsonPath,
      "--markdown-out",
      markdownPath
    ],
    {
      env: buildEngineEnvironment(),
      stdio: ["ignore", "ignore", "ignore"]
    }
  );
  activeChild = child;
  let cancelled = false;
  let heartbeatFailed = false;
  let timedOut = false;
  let heartbeatPromise = Promise.resolve();

  const heartbeatTimer = setInterval(() => {
    heartbeatPromise = heartbeatPromise
      .then(() => sendJobHeartbeat(config, job, "crawl"))
      .then((result) => {
        if (result.cancelRequested) {
          cancelled = true;
          terminateChild(child);
        }
      })
      .catch(() => {
        heartbeatFailed = true;
        terminateChild(child);
      });
  }, Math.min(30_000, Math.max(5_000, config.pollMs)));
  heartbeatTimer.unref();

  const totalTimeout = setTimeout(() => {
    timedOut = true;
    terminateChild(child);
  }, job.totalTimeoutSeconds * 1_000);
  totalTimeout.unref();

  const result = await new Promise((resolve) => {
    child.once("error", () => resolve({ code: null, spawnFailed: true }));
    child.once("exit", (code) => resolve({ code, spawnFailed: false }));
  });
  clearInterval(heartbeatTimer);
  clearTimeout(totalTimeout);
  await heartbeatPromise.catch(() => undefined);
  activeChild = null;

  if (cancelled) return { cancelled: true, failureCode: null };
  if (timedOut) return { cancelled: false, failureCode: "SYSTEM_TIMEOUT" };
  if (heartbeatFailed) return { cancelled: false, failureCode: "SYSTEM_NETWORK" };
  if (result.spawnFailed || result.code !== 0) {
    return { cancelled: false, failureCode: "SYSTEM_INTERNAL" };
  }
  return { cancelled: false, failureCode: null };
}

async function buildReportBundle(jsonPath, markdownPath) {
  const [jsonText, markdown] = await Promise.all([
    fs.readFile(jsonPath, "utf8"),
    fs.readFile(markdownPath, "utf8")
  ]);
  const report = JSON.parse(jsonText);
  const bundle = Buffer.from(JSON.stringify({ json: report, markdown }), "utf8");
  if (bundle.length > MAX_BUNDLE_BYTES) throw new Error("ARTIFACT_INVALID");
  const compressed = gzipSync(bundle);
  if (compressed.length > MAX_COMPRESSED_BYTES) {
    throw new Error("ARTIFACT_STORAGE");
  }
  return {
    reportGzipBase64: compressed.toString("base64"),
    summary: deriveSummary(report)
  };
}

async function processJob(config, job) {
  const directory = await fs.mkdtemp(join(tmpdir(), "enhe-seo-audit-"));
  const jsonPath = join(directory, "audit.json");
  const markdownPath = join(directory, "report.md");
  try {
    const prepared = await sendJobHeartbeat(config, job, "prepare");
    if (prepared.cancelRequested) return;
    const execution = await runEngine(config, job, jsonPath, markdownPath);
    if (execution.cancelled) return;
    if (execution.failureCode) {
      await failJob(config, job, execution.failureCode);
      return;
    }

    const reporting = await sendJobHeartbeat(config, job, "report");
    if (reporting.cancelRequested) return;
    const bundle = await buildReportBundle(jsonPath, markdownPath);
    const uploading = await sendJobHeartbeat(
      config,
      job,
      "upload",
      bundle.summary.pageCount
    );
    if (uploading.cancelRequested) return;
    await completeJob(
      config,
      job,
      bundle.reportGzipBase64,
      bundle.summary
    );
  } catch (error) {
    const code =
      error instanceof Error &&
      ["ARTIFACT_INVALID", "ARTIFACT_STORAGE"].includes(error.message)
        ? error.message
        : "SYSTEM_NETWORK";
    await failJob(config, job, code);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  const config = loadConfig();
  try {
    await verifyEngine(config);
  } catch {
    await writeRuntimeHeartbeat(
      config.heartbeatFile,
      config.heartbeatIdentity,
      { status: "blocked" }
    );
    throw new Error("SEO audit engine verification failed");
  }

  await writeRuntimeHeartbeat(config.heartbeatFile, config.heartbeatIdentity, {
    status: "ok",
    currentRunId: null
  });
  while (!stopping) {
    try {
      const job = await claimJob(config);
      if (job && !isClaimedJob(job, config.engineVersion)) {
        throw new Error("INVALID_JOB_DTO");
      }
      if (job) {
        await writeRuntimeHeartbeat(
          config.heartbeatFile,
          config.heartbeatIdentity,
          { status: "ok", currentRunId: job.id }
        );
        await processJob(config, job);
      }
      await writeRuntimeHeartbeat(config.heartbeatFile, config.heartbeatIdentity, {
        status: "ok",
        currentRunId: null
      });
    } catch {
      await writeRuntimeHeartbeat(
        config.heartbeatFile,
        config.heartbeatIdentity,
        { status: "blocked" }
      );
    }
    if (!stopping) await sleep(config.pollMs);
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    stopping = true;
    if (activeChild) terminateChild(activeChild);
  });
}

main().catch(() => {
  console.error("[seo-audit-worker] startup failed");
  process.exitCode = 1;
});
