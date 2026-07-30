import { promises as fs } from "node:fs";
import { dirname } from "node:path";

let stopping = false;

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function positiveInteger(name, fallback, minimum) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`${name} must be an integer >= ${minimum}`);
  }
  return value;
}

function loadConfig() {
  const baseUrl = new URL(required("SEO_AUDIT_INTERNAL_BASE_URL"));
  if (!/^https?:$/.test(baseUrl.protocol) || baseUrl.username || baseUrl.password) {
    throw new Error("SEO_AUDIT_INTERNAL_BASE_URL is invalid");
  }
  return {
    baseUrl: baseUrl.toString().replace(/\/$/, ""),
    token: required("AUDIT_WORKER_TOKEN_CURRENT"),
    heartbeatFile: required("SEO_AUDIT_SCHEDULER_HEARTBEAT_FILE"),
    intervalMs: positiveInteger("SEO_AUDIT_SCHEDULER_INTERVAL_MS", 60_000, 1_000)
  };
}

async function writeHeartbeat(path, status) {
  await fs.mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await fs.writeFile(
    temporary,
    JSON.stringify({ status, checkedAt: new Date().toISOString() }),
    { encoding: "utf8", mode: 0o600 }
  );
  await fs.rename(temporary, path);
}

async function enqueue(config) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(
      `${config.baseUrl}/api/internal/seo-audit/schedules/enqueue`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({ limit: 50 }),
        redirect: "error",
        signal: controller.signal
      }
    );
    if (!response.ok) throw new Error("SCHEDULER_REQUEST_FAILED");
    const result = await response.json();
    if (!result || result.ok !== true) throw new Error("SCHEDULER_REQUEST_FAILED");
  } finally {
    clearTimeout(timeout);
  }
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  const config = loadConfig();
  while (!stopping) {
    try {
      await enqueue(config);
      await writeHeartbeat(config.heartbeatFile, "ok");
    } catch {
      await writeHeartbeat(config.heartbeatFile, "blocked");
    }
    if (!stopping) await sleep(config.intervalMs);
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    stopping = true;
  });
}

main().catch(() => {
  console.error("[seo-audit-scheduler] startup failed");
  process.exitCode = 1;
});
