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
const migrationNames = [
  "20260725182500_protect_financial_audit_records",
  "20260725182600_validate_financial_audit_restrict_fks",
  "20260725182700_finalize_financial_audit_restrict_fks",
] as const;
const migrationPaths = migrationNames.map((migrationName) =>
  join(root, "prisma", "migrations", migrationName, "migration.sql"),
);
const protectedForeignKeys = [
  "payment_transactions_order_id_fkey",
  "order_refund_records_order_id_fkey",
  "seo_audit_runs_source_order_id_fkey",
  "seo_audit_runs_user_id_fkey",
  "orders_tool_id_fkey",
] as const;

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

  it("uses one atomic Prisma migration per install, validation, and finalization phase", () => {
    const [installMigration, validationMigration, finalizationMigration] =
      migrationPaths.map((migrationPath) => readFileSync(migrationPath, "utf8"));

    expect([...migrationNames].sort()).toEqual([...migrationNames]);
    for (const migration of [
      installMigration,
      validationMigration,
      finalizationMigration,
    ]) {
      expect(migration.match(/\bBEGIN;/g)).toHaveLength(1);
      expect(migration.match(/\bCOMMIT;/g)).toHaveLength(1);
      expect(transactionBodies(migration)).toHaveLength(1);
      expect(migration).toContain("SET LOCAL lock_timeout = '5s'");
    }

    expect(installMigration).toContain("SET LOCAL statement_timeout = '30s'");
    expect(installMigration.match(/SET search_path FROM CURRENT/g)).toHaveLength(3);
    expect(installMigration).toContain(
      'CREATE TRIGGER "task9_guard_order_evidence_delete"',
    );
    expect(installMigration).toContain(
      'CREATE TRIGGER "task9_guard_user_report_delete"',
    );
    expect(installMigration).toContain(
      'CREATE TRIGGER "task9_guard_tool_order_delete"',
    );
    expect(installMigration).toMatch(
      /ALTER TABLE "users"\s+ADD COLUMN "is_test_data" BOOLEAN NOT NULL DEFAULT false/,
    );
    expect(installMigration).toMatch(
      /ALTER TABLE "orders"\s+ADD COLUMN "is_test_data" BOOLEAN NOT NULL DEFAULT false/,
    );
    expect(installMigration.match(/ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID/g)).toHaveLength(5);
    expect(installMigration).not.toMatch(
      /VALIDATE CONSTRAINT|DROP CONSTRAINT|RENAME CONSTRAINT/,
    );

    expect(validationMigration).toContain("SET LOCAL statement_timeout = '10min'");
    expect(validationMigration.match(/VALIDATE CONSTRAINT/g)).toHaveLength(5);
    expect(validationMigration).not.toMatch(
      /ADD CONSTRAINT|DROP CONSTRAINT|RENAME CONSTRAINT|CREATE TRIGGER/,
    );

    expect(finalizationMigration).toContain("SET LOCAL statement_timeout = '30s'");
    expect(finalizationMigration).not.toContain("VALIDATE CONSTRAINT");
    expect(finalizationMigration).toContain(
      'DROP TRIGGER "task9_guard_order_evidence_delete"',
    );
    expect(finalizationMigration).toContain(
      'DROP TRIGGER "task9_guard_user_report_delete"',
    );
    expect(finalizationMigration).toContain(
      'DROP TRIGGER "task9_guard_tool_order_delete"',
    );
    for (const constraint of protectedForeignKeys) {
      const temporaryConstraint = temporaryConstraintName(constraint);
      expect(installMigration).toContain(
        `ADD CONSTRAINT "${temporaryConstraint}"`,
      );
      expect(validationMigration).toContain(
        `VALIDATE CONSTRAINT "${temporaryConstraint}"`,
      );
      expect(finalizationMigration).toContain(`DROP CONSTRAINT "${constraint}"`);
      expect(finalizationMigration).toMatch(
        new RegExp(
          `RENAME CONSTRAINT "${temporaryConstraint}"\\s+TO "${constraint}"`,
        ),
      );
    }

    expect(
      [installMigration, validationMigration, finalizationMigration].join("\n"),
    ).not.toMatch(/DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM|UPDATE\s+"/i);
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

function transactionBodies(sql: string) {
  return [...sql.matchAll(/\bBEGIN;\s*([\s\S]*?)\bCOMMIT;/g)].map(
    (match) => match[1],
  );
}

function temporaryConstraintName(constraint: string) {
  return constraint.replace(/_fkey$/, "_restrict_fkey");
}
