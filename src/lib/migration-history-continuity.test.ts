import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("production migration history continuity", () => {
  it("retains the already-applied AI news import metadata migration", () => {
    const migration = read(
      "prisma/migrations/20260618143000_add_ai_news_import_metadata/migration.sql",
    );
    const schema = read("prisma/schema.prisma");

    for (const column of [
      "source_channel",
      "imported_at",
      "import_batch_id",
      "raw_import_payload",
    ]) {
      expect(migration).toContain(column);
    }
    expect(schema).toContain('sourceChannel         String?');
    expect(schema).toContain('importedAt            DateTime?');
    expect(schema).toContain('importBatchId         String?');
    expect(schema).toContain('rawImportPayload      Json?');
    expect(schema).toContain("@@index([sourceChannel, importedAt])");
    expect(schema).toContain("@@index([importBatchId])");
  });
});
