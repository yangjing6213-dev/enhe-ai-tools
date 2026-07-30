import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const schema = readFileSync(resolve(process.cwd(), "prisma", "schema.prisma"), "utf8");
const migration = readFileSync(
  resolve(
    process.cwd(),
    "prisma",
    "migrations",
    "20260727090000_add_seo_audit_email_outbox",
    "migration.sql",
  ),
  "utf8",
);
const normalizedSchema = schema.replace(/\s+/g, " ");

describe("SEO audit email outbox schema", () => {
  it("adds a durable leased outbox without destructive migration statements", () => {
    expect(normalizedSchema).toContain("enum SeoAuditEmailOutboxStatus");
    expect(normalizedSchema).toContain("model SeoAuditEmailOutbox");
    expect(normalizedSchema).toContain(
      'notificationId String @unique @map("notification_id")',
    );
    expect(normalizedSchema).toContain(
      'attemptCount Int @default(0) @map("attempt_count")',
    );
    expect(normalizedSchema).toContain(
      'maxAttempts Int @default(5) @map("max_attempts")',
    );
    expect(normalizedSchema).toContain(
      'lastErrorCode String? @map("last_error_code")',
    );
    expect(normalizedSchema).toContain(
      'completionNotificationPreparedAt DateTime? @map("completion_notification_prepared_at")',
    );
    expect(normalizedSchema).toContain("@@index([status, availableAt])");
    expect(normalizedSchema).toContain("@@index([leaseExpiresAt])");

    expect(migration).toContain('CREATE TYPE "SeoAuditEmailOutboxStatus"');
    expect(migration).toContain('CREATE TABLE "seo_audit_email_outbox"');
    expect(migration).toContain(
      'ADD COLUMN "completion_notification_prepared_at" TIMESTAMP(3)',
    );
    expect(migration).toContain('FOREIGN KEY ("notification_id")');
    expect(migration).not.toMatch(
      /(?:^|\n)\s*(?:DROP\b|DELETE\s+FROM\b|TRUNCATE\b)/i,
    );
    expect(migration).not.toMatch(/ALTER\s+COLUMN|DROP\s+COLUMN/i);
  });
});
