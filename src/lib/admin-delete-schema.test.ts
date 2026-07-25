import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const schema = readFileSync(join(root, "prisma", "schema.prisma"), "utf8");
const adminActions = readFileSync(
  join(root, "src", "app", "admin", "actions.ts"),
  "utf8",
);
const orderPage = readFileSync(
  join(root, "src", "app", "admin", "orders", "[id]", "page.tsx"),
  "utf8",
);
const userPage = readFileSync(
  join(root, "src", "app", "admin", "users", "[id]", "page.tsx"),
  "utf8",
);
const migrationPath = join(
  root,
  "prisma",
  "migrations",
  "20260725182500_protect_financial_audit_records",
  "migration.sql",
);

function model(name: string) {
  const match = schema.match(new RegExp(`model ${name} \\{([\\s\\S]*?)\\n\\}`, "m"));
  if (!match) throw new Error(`Missing Prisma model: ${name}`);
  return match[1];
}

describe("financial audit hard-delete protection schema", () => {
  it("marks users and orders explicitly as test data without inferred identity rules", () => {
    expect(model("User")).toMatch(
      /isTestData\s+Boolean\s+@default\(false\)\s+@map\("is_test_data"\)/,
    );
    expect(model("Order")).toMatch(
      /isTestData\s+Boolean\s+@default\(false\)\s+@map\("is_test_data"\)/,
    );
    expect(orderPage).toMatch(/isTestData:\s*order\.isTestData/);
    expect(userPage).toMatch(/isTestData:\s*user\.isTestData/);
  });

  it("uses Restrict for payment, refund, report-order, and authenticated run ownership", () => {
    expect(model("PaymentTransaction")).toMatch(
      /order\s+Order\s+@relation\(fields: \[orderId\], references: \[id\], onDelete: Restrict\)/,
    );
    expect(model("OrderRefundRecord")).toMatch(
      /order\s+Order\s+@relation\(fields: \[orderId\], references: \[id\], onDelete: Restrict\)/,
    );
    expect(model("SeoAuditRun")).toMatch(
      /sourceOrder\s+Order\?\s+@relation\("SeoAuditFundedRuns", fields: \[sourceOrderId\], references: \[id\], onDelete: Restrict\)/,
    );
    expect(model("SeoAuditRun")).toMatch(
      /user\s+User\?\s+@relation\(fields: \[userId\], references: \[id\], onDelete: Restrict\)/,
    );
    expect(model("Order")).toMatch(
      /tool\s+Tool\?\s+@relation\(fields: \[toolId\], references: \[id\], onDelete: Restrict\)/,
    );
  });

  it("ships one bounded additive migration with staged foreign-key validation", () => {
    const migration = readFileSync(migrationPath, "utf8");
    expect(migration.trimStart().startsWith("BEGIN;")).toBe(true);
    expect(migration.trimEnd().endsWith("COMMIT;")).toBe(true);
    expect(migration).toContain("SET LOCAL lock_timeout = '5s'");
    expect(migration).toMatch(
      /ALTER TABLE "users"\s+ADD COLUMN "is_test_data" BOOLEAN NOT NULL DEFAULT false/,
    );
    expect(migration).toMatch(
      /ALTER TABLE "orders"\s+ADD COLUMN "is_test_data" BOOLEAN NOT NULL DEFAULT false/,
    );
    expect(migration).toContain('DROP CONSTRAINT "payment_transactions_order_id_fkey"');
    expect(migration).toContain('DROP CONSTRAINT "order_refund_records_order_id_fkey"');
    expect(migration).toContain('DROP CONSTRAINT "seo_audit_runs_source_order_id_fkey"');
    expect(migration).toContain('DROP CONSTRAINT "seo_audit_runs_user_id_fkey"');
    expect(migration).toContain('DROP CONSTRAINT "orders_tool_id_fkey"');
    expect(migration.match(/ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID/g)).toHaveLength(5);
    expect(migration.match(/VALIDATE CONSTRAINT/g)).toHaveLength(5);
    expect(migration).not.toMatch(/DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM|UPDATE\s+"/i);
  });

  it("keeps admin hard-delete entrypoints away from protected evidence cleanup", () => {
    const deleteUserSource = exportedFunction("deleteUserAdminAction");
    const deleteOrderSource = exportedFunction("deleteOrderAdminAction");
    const deleteToolSource = exportedFunction("deleteToolAction");

    expect(deleteUserSource).not.toMatch(/(?:paymentProof|orderRefundRecord|toolPurchase|seoAuditRun|adminAuditLog)\.deleteMany/);
    expect(deleteOrderSource).not.toMatch(/(?:paymentProof|orderRefundRecord|toolPurchase|seoAuditRun)\.deleteMany/);
    expect(deleteToolSource).not.toMatch(/toolPurchase\.deleteMany|order\.updateMany/);
  });
});

function exportedFunction(name: string) {
  const start = adminActions.indexOf(`export async function ${name}`);
  if (start < 0) throw new Error(`Missing admin action: ${name}`);
  const next = adminActions.indexOf("\nexport async function ", start + 1);
  return adminActions.slice(start, next < 0 ? undefined : next);
}
