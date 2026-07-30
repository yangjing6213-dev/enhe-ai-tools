import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const schema = readFileSync(
  resolve(process.cwd(), "prisma", "schema.prisma"),
  "utf8",
).replace(/\s+/g, " ");
const migration = readFileSync(
  resolve(
    process.cwd(),
    "prisma",
    "migrations",
    "20260727100000_add_seo_audit_schedule_notification_email",
    "migration.sql",
  ),
  "utf8",
);

describe("SEO audit schedule notification email schema", () => {
  it("adds one optional service-notification address without rewriting data", () => {
    expect(schema).toContain(
      'notificationEmail String? @map("notification_email")',
    );
    expect(migration).toMatch(
      /ALTER TABLE "seo_audit_schedules"\s+ADD COLUMN "notification_email" TEXT;/,
    );
    expect(migration).toMatch(/^BEGIN;/m);
    expect(migration).toMatch(/COMMIT;\s*$/m);
    expect(migration).not.toMatch(
      /(?:^|\n)\s*(?:DROP\b|DELETE\s+FROM\b|TRUNCATE\b|ALTER\s+COLUMN)/i,
    );
  });
});
