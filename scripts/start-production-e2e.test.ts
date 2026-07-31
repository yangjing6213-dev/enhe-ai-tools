import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { clearStandaloneDataCache } = require("./start-production-e2e.cjs") as {
  clearStandaloneDataCache: (root?: string) => string;
};

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) =>
      rm(root, { recursive: true, force: true }),
    ),
  );
});

describe("production E2E standalone startup", () => {
  it("clears only the standalone fetch cache", async () => {
    const root = join(
      tmpdir(),
      `enhe-production-e2e-cache-${process.pid}-${Date.now()}`,
    );
    temporaryRoots.push(root);

    const fetchCache = join(
      root,
      ".next",
      "standalone",
      ".next",
      "cache",
      "fetch-cache",
    );
    const serverSentinel = join(
      root,
      ".next",
      "standalone",
      ".next",
      "server",
      "sentinel.txt",
    );
    await mkdir(fetchCache, { recursive: true });
    await mkdir(join(serverSentinel, ".."), { recursive: true });
    await writeFile(join(fetchCache, "cached-entry"), "stale", "utf8");
    await writeFile(serverSentinel, "keep", "utf8");

    expect(clearStandaloneDataCache(root)).toBe(fetchCache);
    await expect(access(fetchCache)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(readFile(serverSentinel, "utf8")).resolves.toBe("keep");
  });
});
