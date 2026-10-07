import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type AstNode = {
  type: string;
  value?: string;
  nodes?: AstNode[];
  invalid?: boolean;
};

type BracesApi = {
  (input: string, options?: { expand?: boolean }): string[];
  parse(input: string): AstNode;
  compile(input: string | AstNode): string;
  expand(input: string | AstNode): string[];
  stringify(input: string | AstNode): string;
};

const require = createRequire(import.meta.url);
const braces = require("braces") as BracesApi;
const bracesPackage = require("braces/package.json") as {
  version: string;
  enhePatch?: { advisory?: string; nestingLimit?: number };
};
const MAX_DEPTH = 100;
const packageLock = JSON.parse(readFileSync(resolve(process.cwd(), "package-lock.json"), "utf8")) as {
  packages: Record<string, { version?: string; resolved?: string; link?: boolean; dependencies?: Record<string, string> }>;
};

function nestedPattern(open: string, close: string, depth: number) {
  return `${open.repeat(depth)}x${close.repeat(depth)}`;
}

function deeplyNestedAst(depth: number): AstNode {
  let node: AstNode = { type: "text", value: "x" };
  for (let index = 0; index < depth; index += 1) {
    node = { type: "brace", nodes: [node] };
  }
  return { type: "root", nodes: [node] };
}

describe("braces nesting safety", () => {
  it("loads the maintained local fork for the unresolved upstream advisory", () => {
    expect(bracesPackage.version).toBe("3.0.4-enhe.0");
    expect(bracesPackage.enhePatch).toMatchObject({
      advisory: "GHSA-vfj7-8cjw-p6xm",
      nestingLimit: MAX_DEPTH,
    });
  });

  it("records the fork and its runtime dependencies as auditable lockfile packages", () => {
    expect(packageLock.packages["node_modules/braces"]).toMatchObject({
      version: "3.0.4-enhe.0",
      resolved: "file:vendor/braces-3.0.4-enhe.0.tgz",
      dependencies: { "fill-range": "^7.1.1" },
    });
    expect(packageLock.packages["node_modules/fill-range"]?.version).toBe("7.1.1");
    expect(packageLock.packages["node_modules/to-regex-range"]?.version).toBe("5.0.1");
    expect(packageLock.packages["node_modules/is-number"]?.version).toBe("7.0.0");
  });

  it("keeps ordinary brace compilation and expansion working", () => {
    const pattern = "src/{app,lib}/**/*.ts";
    expect(braces(pattern)).toEqual(["src/(app|lib)/**/*.ts"]);
    expect(braces(pattern, { expand: true })).toEqual([
      "src/app/**/*.ts",
      "src/lib/**/*.ts",
    ]);
  });

  it("keeps patterns at the maximum nesting limit working", () => {
    const pattern = nestedPattern("{", "}", MAX_DEPTH);
    expect(() => braces.parse(pattern)).not.toThrow();
    expect(() => braces.compile(pattern)).not.toThrow();
    expect(() => braces.expand(pattern)).not.toThrow();
  });

  it("rejects brace patterns beyond the default nesting limit", () => {
    expect(() => braces.parse(nestedPattern("{", "}", MAX_DEPTH + 1))).toThrow(/exceeds max depth/i);
  });

  it("rejects deeply nested parentheses beyond the default nesting limit", () => {
    expect(() => braces.parse(nestedPattern("(", ")", MAX_DEPTH + 1))).toThrow(/exceeds max depth/i);
  });

  it.each(["compile", "expand", "stringify"] as const)(
    "guards direct %s calls with deeply nested syntax trees",
    (method) => {
      const ast = deeplyNestedAst(MAX_DEPTH + 1);
      expect(() => braces[method](ast)).toThrow(/exceeds max depth/i);
    },
  );

  it("preserves the depth limit when expansion stringifies an invalid nested node", () => {
    const ast = deeplyNestedAst(MAX_DEPTH + 1);
    let node = ast;

    for (let depth = 0; depth < MAX_DEPTH; depth += 1) {
      node = node.nodes![0]!;
    }
    node.invalid = true;

    expect(() => braces.expand(ast)).toThrow(/exceeds max depth/i);
  });
});
