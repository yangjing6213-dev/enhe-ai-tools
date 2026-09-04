import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("homepage recommendation schema", () => {
  it("adds a persisted home recommendation flag for tools", () => {
    const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");
    const migrationPath = join(
      process.cwd(),
      "prisma/migrations/20260612101000_add_tool_home_recommendation/migration.sql"
    );
    const migration = existsSync(migrationPath) ? readFileSync(migrationPath, "utf8") : "";

    expect(schema).toContain("isHomeRecommended Boolean");
    expect(schema).toContain('@map("is_home_recommended")');
    expect(schema).toContain("@@index([isHomeRecommended, status, sortOrder])");
    expect(migration).toContain('ADD COLUMN "is_home_recommended" BOOLEAN NOT NULL DEFAULT false');
    expect(migration).toContain('"tools_home_recommended_idx"');
  });
});
