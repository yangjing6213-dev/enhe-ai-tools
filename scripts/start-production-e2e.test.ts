import { readFileSync } from "node:fs";
import { access, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { clearStandaloneDataCache, configureStandaloneEnvironment } = require("./start-production-e2e.cjs") as {
  clearStandaloneDataCache: (root?: string) => string;
  configureStandaloneEnvironment: (environment?: NodeJS.ProcessEnv) => void;
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
  it("anchors CLI cache cleanup to the standalone script root", () => {
    const startupSource = readFileSync(
      new URL("./start-production-e2e.cjs", import.meta.url),
      "utf8",
    );

    expect(startupSource).toMatch(
      /if \(require\.main === module\)\s*\{\s*const root = resolve\(__dirname, "\.\."\);\s*configureStandaloneEnvironment\(process\.env\);\s*process\.chdir\(root\);\s*clearStandaloneDataCache\(root\);/,
    );
    expect(startupSource.indexOf("configureStandaloneEnvironment(process.env);")).toBeGreaterThanOrEqual(0);
    expect(startupSource.indexOf("configureStandaloneEnvironment(process.env);")).toBeLessThan(
      startupSource.indexOf("clearStandaloneDataCache(root);"),
    );
    expect(startupSource.indexOf("configureStandaloneEnvironment(process.env);")).toBeLessThan(
      startupSource.indexOf('require(join(__dirname, "start-standalone.cjs"));'),
    );
  });

  it("forces the standalone server onto loopback with empty database URLs", () => {
    const environment: NodeJS.ProcessEnv = {
      HOSTNAME: "0.0.0.0",
      NODE_ENV: "test",
      DATABASE_URL: "",
      DIRECT_URL: "",
      SEO_AUDIT_TEST_DATABASE_URL: "",
    };

    configureStandaloneEnvironment(environment);

    expect(environment).toMatchObject({
      HOSTNAME: "127.0.0.1",
      DATABASE_URL: "",
      DIRECT_URL: "",
      SEO_AUDIT_TEST_DATABASE_URL: "",
    });
  });

  it.each(["DATABASE_URL", "DIRECT_URL", "SEO_AUDIT_TEST_DATABASE_URL"])(
    "refuses to continue when %s is inherited",
    (key) => {
      const environment: NodeJS.ProcessEnv = {
        HOSTNAME: "0.0.0.0",
        NODE_ENV: "test",
        DATABASE_URL: "",
        DIRECT_URL: "",
        SEO_AUDIT_TEST_DATABASE_URL: "",
        [key]: "postgresql://test.invalid/fixture",
      };

      expect(() => configureStandaloneEnvironment(environment)).toThrow(
        "The standalone E2E server requires empty database URL variables.",
      );
    },
  );

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

  it("refuses to clear a fetch cache reached through an outside symlink", async () => {
    const root = join(
      tmpdir(),
      `enhe-production-e2e-symlink-root-${process.pid}-${Date.now()}`,
    );
    const outside = join(
      tmpdir(),
      `enhe-production-e2e-symlink-outside-${process.pid}-${Date.now()}`,
    );
    temporaryRoots.push(root, outside);

    const cacheParent = join(root, ".next", "standalone", ".next");
    const outsideFetchCache = join(outside, "fetch-cache");
    const outsideSentinel = join(outsideFetchCache, "keep.txt");
    const cacheLink = join(cacheParent, "cache");

    await mkdir(cacheParent, { recursive: true });
    await mkdir(outsideFetchCache, { recursive: true });
    await writeFile(outsideSentinel, "keep", "utf8");
    await symlink(
      outside,
      cacheLink,
      process.platform === "win32" ? "junction" : "dir",
    );

    expect(() => clearStandaloneDataCache(root)).toThrow(/symbolic link|junction/i);
    await expect(readFile(outsideSentinel, "utf8")).resolves.toBe("keep");
  });
});
