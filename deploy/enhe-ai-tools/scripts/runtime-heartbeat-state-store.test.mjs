import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { expect, it } from "vitest";
import { writeRuntimeHeartbeat } from "./runtime-heartbeat.mjs";

it("serializes 20 concurrent same-target writes and preserves the final invocation", async () => {
  const directory = await fs.mkdtemp(join(tmpdir(), "enhe-runtime-heartbeat-state-store-"));
  const targetPath = join(directory, "heartbeat.json");
  const identity = {
    releaseRef: "a".repeat(40),
    startedAt: "2026-08-13T00:00:00.000Z"
  };

  try {
    const writes = Array.from({ length: 20 }, (_, invocation) =>
      writeRuntimeHeartbeat(targetPath, identity, {
        status: "ok",
        invocation,
        currentRunId: `run-${invocation}`
      })
    );

    await expect(Promise.all(writes)).resolves.toHaveLength(20);

    const finalHeartbeat = JSON.parse(await fs.readFile(targetPath, "utf8"));
    expect(finalHeartbeat).toMatchObject({
      releaseRef: identity.releaseRef,
      status: "ok",
      invocation: 19,
      currentRunId: "run-19"
    });
    expect((await fs.readdir(directory)).filter((name) => name !== "heartbeat.json")).toEqual([]);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

it("keeps concurrent writes to 10 targets independent", async () => {
  const directory = await fs.mkdtemp(join(tmpdir(), "enhe-runtime-heartbeat-state-store-"));
  const identity = {
    releaseRef: "b".repeat(40),
    startedAt: "2026-08-13T00:00:00.000Z"
  };

  try {
    const writes = Array.from({ length: 10 }, (_, target) =>
      Array.from({ length: 5 }, (_, invocation) =>
        writeRuntimeHeartbeat(join(directory, `heartbeat-${target}.json`), identity, {
          status: "ok",
          target,
          invocation
        })
      )
    ).flat();

    await expect(Promise.all(writes)).resolves.toHaveLength(50);

    for (let target = 0; target < 10; target++) {
      const heartbeat = JSON.parse(
        await fs.readFile(join(directory, `heartbeat-${target}.json`), "utf8")
      );
      expect(heartbeat).toMatchObject({ releaseRef: identity.releaseRef, target, invocation: 4 });
    }
    expect((await fs.readdir(directory)).filter((name) => name.endsWith(".tmp"))).toEqual([]);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

it("preserves sequential start, running, and stopped states", async () => {
  const directory = await fs.mkdtemp(join(tmpdir(), "enhe-runtime-heartbeat-state-store-"));
  const targetPath = join(directory, "heartbeat.json");
  const identity = { releaseRef: null, startedAt: "2026-08-13T00:00:00.000Z" };

  try {
    await writeRuntimeHeartbeat(targetPath, identity, { status: "start" });
    await writeRuntimeHeartbeat(targetPath, identity, { status: "running" });
    await writeRuntimeHeartbeat(targetPath, identity, { status: "stopped" });

    expect(JSON.parse(await fs.readFile(targetPath, "utf8"))).toMatchObject({
      releaseRef: null,
      status: "stopped"
    });
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

it("cleans its temporary file when the final rename fails", async () => {
  const directory = await fs.mkdtemp(join(tmpdir(), "enhe-runtime-heartbeat-state-store-"));
  const targetPath = join(directory, "heartbeat.json");
  const identity = { releaseRef: null, startedAt: "2026-08-13T00:00:00.000Z" };

  try {
    await fs.mkdir(targetPath);
    await expect(
      writeRuntimeHeartbeat(targetPath, identity, { status: "blocked" })
    ).rejects.toBeDefined();
    expect((await fs.readdir(directory)).filter((name) => name.endsWith(".tmp"))).toEqual([]);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

it("continues with a later write after a prior write fails", async () => {
  const directory = await fs.mkdtemp(join(tmpdir(), "enhe-runtime-heartbeat-state-store-"));
  const targetPath = join(directory, "heartbeat.json");
  const identity = { releaseRef: null, startedAt: "2026-08-13T00:00:00.000Z" };

  try {
    await fs.mkdir(targetPath);
    await expect(
      writeRuntimeHeartbeat(targetPath, identity, { status: "blocked" })
    ).rejects.toBeDefined();
    await fs.rm(targetPath, { recursive: true, force: true });

    await expect(
      writeRuntimeHeartbeat(targetPath, identity, { status: "recovered" })
    ).resolves.toBeUndefined();
    expect(JSON.parse(await fs.readFile(targetPath, "utf8"))).toMatchObject({
      releaseRef: null,
      status: "recovered"
    });
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

it("serializes relative and absolute aliases of the same target", async () => {
  const directory = await fs.mkdtemp(join(tmpdir(), "enhe-runtime-heartbeat-state-store-"));
  const targetPath = join(directory, "heartbeat.json");
  const relativePath = relative(process.cwd(), targetPath);
  const identity = { releaseRef: null, startedAt: "2026-08-13T00:00:00.000Z" };

  try {
    await expect(
      Promise.all([
        writeRuntimeHeartbeat(relativePath, identity, { status: "relative", invocation: 0 }),
        writeRuntimeHeartbeat(targetPath, identity, { status: "absolute", invocation: 1 })
      ])
    ).resolves.toHaveLength(2);

    expect(JSON.parse(await fs.readFile(targetPath, "utf8"))).toMatchObject({
      status: "absolute",
      invocation: 1
    });
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
