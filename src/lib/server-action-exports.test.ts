import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

describe("server action exports", () => {
  test("admin actions only exports async server actions as runtime values", () => {
    const source = readFileSync(join(process.cwd(), "src", "app", "admin", "actions.ts"), "utf8");
    const invalidRuntimeExports = source
      .split(/\r?\n/)
      .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
      .filter(({ line }) => line.startsWith("export "))
      .filter(({ line }) => !line.startsWith("export async function "))
      .filter(({ line }) => !line.startsWith("export type "));

    expect(invalidRuntimeExports).toEqual([]);
  });
});
