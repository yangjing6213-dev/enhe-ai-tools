import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { dirname, resolve } from "node:path";

const startedAt = new Date(Date.now() - process.uptime() * 1_000).toISOString();
const runtimeHeartbeatWriteQueues = new Map();

function runtimeHeartbeatQueueKey(path) {
  const absolutePath = resolve(path);
  return process.platform === "win32" ? absolutePath.toLowerCase() : absolutePath;
}

async function writeRuntimeHeartbeatFile(path, identity, payload) {
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await fs.mkdir(dirname(path), { recursive: true });
    await fs.writeFile(
      temporary,
      JSON.stringify({
        ...payload,
        releaseRef: identity.releaseRef,
        startedAt: identity.startedAt,
        checkedAt: new Date().toISOString()
      }),
      { encoding: "utf8", mode: 0o600 }
    );
    await fs.rename(temporary, path);
  } finally {
    await fs.rm(temporary, { force: true }).catch(() => {});
  }
}

export function loadRuntimeHeartbeatIdentity(env = process.env) {
  const candidate = env.RELEASE_REF?.trim() ?? "";
  const releaseRef = /^[a-f0-9]{40}$/i.test(candidate)
    ? candidate.toLowerCase()
    : null;
  if (!releaseRef && env.NODE_ENV === "production") {
    throw new Error("RELEASE_REF must be a 40-character hexadecimal commit ref");
  }
  return { releaseRef, startedAt };
}

export async function writeRuntimeHeartbeat(path, identity, payload) {
  const key = runtimeHeartbeatQueueKey(path);
  const previous = runtimeHeartbeatWriteQueues.get(key) ?? Promise.resolve();
  const current = previous
    .catch(() => {})
    .then(() => writeRuntimeHeartbeatFile(path, identity, payload));
  runtimeHeartbeatWriteQueues.set(key, current);

  try {
    await current;
  } finally {
    if (runtimeHeartbeatWriteQueues.get(key) === current) {
      runtimeHeartbeatWriteQueues.delete(key);
    }
  }
}
