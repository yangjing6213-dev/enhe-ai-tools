import { spawn } from "node:child_process";
import { once } from "node:events";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, it } from "vitest";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(scriptsDir, "runtime-heartbeat-engine-fixture.mjs");
const children = [];

function startFixture() {
  const child = spawn(process.execPath, [fixturePath], {
    stdio: ["pipe", "pipe", "ignore"]
  });
  children.push(child);
  return child;
}

function waitForLine(child, expected) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const cleanup = () => {
      child.stdout.off("data", onData);
      child.off("error", onError);
      child.off("exit", onExit);
    };
    const onData = (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line === expected) {
          cleanup();
          resolve();
          return;
        }
      }
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const onExit = (code) => {
      cleanup();
      reject(new Error(`fixture exited before ${expected}: ${code}`));
    };
    child.stdout.on("data", onData);
    child.on("error", onError);
    child.on("exit", onExit);
  });
}

async function closeFixture(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill();
  await once(child, "close").catch(() => undefined);
}

afterEach(async () => {
  await Promise.all(children.splice(0).map(closeFixture));
});

it("completes 25 READY/HOLD/RELEASE protocol rounds with explicit ACKs", async () => {
  for (let round = 0; round < 25; round++) {
    const child = startFixture();
    await waitForLine(child, "READY");
    child.stdin.write("HOLD\n");
    await waitForLine(child, "HOLD_ACK");
    child.stdin.write("RELEASE\n");
    await waitForLine(child, "RELEASE_ACK");
    await expect(once(child, "close")).resolves.toBeDefined();
    expect(child.exitCode).toBe(0);
  }
}, 30_000);

it("completes 25 READY/ABORT protocol rounds with explicit ACKs", async () => {
  for (let round = 0; round < 25; round++) {
    const child = startFixture();
    await waitForLine(child, "READY");
    child.stdin.write("ABORT\n");
    await waitForLine(child, "ABORT_ACK");
    await expect(once(child, "close")).resolves.toBeDefined();
    expect(child.exitCode).toBe(1);
  }
}, 30_000);
