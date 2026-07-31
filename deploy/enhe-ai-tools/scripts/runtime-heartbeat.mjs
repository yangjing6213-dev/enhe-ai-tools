import { promises as fs } from "node:fs";
import { dirname } from "node:path";

const startedAt = new Date(Date.now() - process.uptime() * 1_000).toISOString();

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
  await fs.mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
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
}
