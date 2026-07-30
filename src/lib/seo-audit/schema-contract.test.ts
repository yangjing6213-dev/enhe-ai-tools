import { readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const schemaPath = resolve(process.cwd(), "prisma", "schema.prisma");
const orderTypeMigrationPath = resolve(
  process.cwd(),
  "prisma",
  "migrations",
  "20260725085900_add_seo_audit_order_types",
  "migration.sql"
);
const commercialMigrationPath = resolve(
  process.cwd(),
  "prisma",
  "migrations",
  "20260725090000_add_seo_audit_commercialization",
  "migration.sql"
);
const artifactUploadMigrationPath = resolve(
  process.cwd(),
  "prisma",
  "migrations",
  "20260725233000_add_seo_audit_artifact_upload_gc",
  "migration.sql"
);

const schema = readFileSync(schemaPath, "utf8");
const orderTypeMigration = readFileSync(orderTypeMigrationPath, "utf8");
const commercialMigration = readFileSync(commercialMigrationPath, "utf8");
const artifactUploadMigration = readFileSync(artifactUploadMigrationPath, "utf8");

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function getPrismaBlock(kind: "enum" | "model", name: string) {
  const match = schema.match(new RegExp(`^${kind} ${name} \\{([\\s\\S]*?)^\\}`, "m"));
  expect(match, `${kind} ${name} must exist`).not.toBeNull();
  return match![1]
    .split(/\r?\n/)
    .map(normalizeWhitespace)
    .filter(Boolean);
}

function expectExactPrismaLines(modelName: string, expectedLines: string[]) {
  expect(getPrismaBlock("model", modelName)).toEqual(
    expect.arrayContaining(expectedLines.map(normalizeWhitespace))
  );
}

function getSqlStatements(sql: string) {
  return sql
    .split(";")
    .map(normalizeWhitespace)
    .filter(Boolean);
}

function getSqlTableLines(tableName: string, migration = commercialMigration) {
  const match = migration.match(
    new RegExp(`CREATE TABLE "${tableName}" \\(([\\s\\S]*?)\\n\\);`, "m")
  );
  expect(match, `table ${tableName} must exist`).not.toBeNull();
  return match![1]
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line).replace(/,$/, ""))
    .filter(Boolean);
}

function splitSqlValues(valueList: string) {
  const values: string[] = [];
  let start = 0;
  let depth = 0;
  let inQuote = false;

  for (let index = 0; index < valueList.length; index += 1) {
    const char = valueList[index];
    if (char === "'" && inQuote && valueList[index + 1] === "'") {
      index += 1;
      continue;
    }
    if (char === "'") {
      inQuote = !inQuote;
      continue;
    }
    if (inQuote) continue;
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (char === "," && depth === 0) {
      values.push(valueList.slice(start, index).trim());
      start = index + 1;
    }
  }

  values.push(valueList.slice(start).trim());
  return values;
}

function parseSqlTuples(valuesSql: string) {
  const tuples: string[][] = [];
  let start = -1;
  let depth = 0;
  let inQuote = false;

  for (let index = 0; index < valuesSql.length; index += 1) {
    const char = valuesSql[index];
    if (char === "'" && inQuote && valuesSql[index + 1] === "'") {
      index += 1;
      continue;
    }
    if (char === "'") {
      inQuote = !inQuote;
      continue;
    }
    if (inQuote) continue;
    if (char === "(") {
      if (depth === 0) start = index + 1;
      depth += 1;
      continue;
    }
    if (char === ")") {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        tuples.push(splitSqlValues(valuesSql.slice(start, index)));
        start = -1;
      }
    }
  }

  expect(depth).toBe(0);
  return tuples;
}

function parseSqlScalar(value: string) {
  if (value === "NULL") return null;
  const stringMatch = value.match(/^'((?:''|[^'])*)'$/);
  return stringMatch ? stringMatch[1].replace(/''/g, "'") : value;
}

function getOfferSeedRows() {
  const match = commercialMigration.match(
    /INSERT INTO "seo_audit_offers"\s*\(([\s\S]*?)\)\s*VALUES\s*([\s\S]*?);/
  );
  expect(match, "SEO audit offer seed insert must exist").not.toBeNull();

  const columns = [...match![1].matchAll(/"([^"]+)"/g)].map((column) => column[1]);
  return parseSqlTuples(match![2]).map((values) => {
    expect(values).toHaveLength(columns.length);
    return Object.fromEntries(
      columns.map((column, index) => [column, parseSqlScalar(values[index])])
    );
  });
}

function getMigrationIndexes() {
  return [
    ...commercialMigration.matchAll(
      /CREATE\s+(UNIQUE\s+)?INDEX\s+"([^"]+)"\s+ON\s+"([^"]+)"\s*\(([\s\S]*?)\);/g
    )
  ].map((match) => ({
    unique: Boolean(match[1]),
    name: match[2],
    table: match[3],
    columns: [...match[4].matchAll(/"([^"]+)"/g)].map((column) => column[1])
  }));
}

describe("SEO audit commercial schema contract", () => {
  it("locks the four OrderType values and exactly ten SEO audit models", () => {
    expect(getPrismaBlock("enum", "OrderType")).toEqual([
      "vip",
      "software_download",
      "seo_audit_credit",
      "seo_audit_monitoring"
    ]);

    const modelNames = [...schema.matchAll(/^model (SeoAudit\w+) \{/gm)].map(
      (match) => match[1]
    );
    expect(modelNames).toEqual([
      "SeoAuditOffer",
      "SeoAuditProject",
      "SeoAuditRun",
      "SeoAuditArtifactUpload",
      "SeoAuditCredit",
      "SeoAuditSubscription",
      "SeoAuditSubscriptionOrder",
      "SeoAuditSchedule",
      "SeoAuditWorkerHeartbeat",
      "SeoAuditEmailOutbox"
    ]);

    expectExactPrismaLines("User", [
      "seoAuditProjects SeoAuditProject[]",
      "seoAuditRuns SeoAuditRun[]",
      "seoAuditCredits SeoAuditCredit[]",
      "seoAuditSubscriptions SeoAuditSubscription[]"
    ]);
    expectExactPrismaLines("Order", [
      'seoAuditOfferId String? @map("seo_audit_offer_id")',
      'seoAuditTargetOrigin String? @map("seo_audit_target_origin")',
      'seoAuditSourceRunId String? @map("seo_audit_source_run_id")',
      "seoAuditOffer SeoAuditOffer? @relation(fields: [seoAuditOfferId], references: [id], onDelete: SetNull)",
      'seoAuditSourceRun SeoAuditRun? @relation("SeoAuditUpgradeSourceRun", fields: [seoAuditSourceRunId], references: [id], onDelete: SetNull)',
      "seoAuditCredit SeoAuditCredit?",
      "seoAuditSubscriptionOrder SeoAuditSubscriptionOrder?",
      'seoAuditRuns SeoAuditRun[] @relation("SeoAuditFundedRuns")',
      "@@index([seoAuditOfferId, orderStatus])",
      "@@index([seoAuditSourceRunId])"
    ]);
  });

  it("locks model relations, uniqueness, and indexes without changing ToolPurchase ownership", () => {
    expectExactPrismaLines("SeoAuditOffer", [
      "code String @unique",
      "orders Order[]",
      "runs SeoAuditRun[]",
      "credits SeoAuditCredit[]",
      "subscriptions SeoAuditSubscription[]",
      "@@index([status])"
    ]);
    expectExactPrismaLines("SeoAuditProject", [
      "user User @relation(fields: [userId], references: [id])",
      "runs SeoAuditRun[]",
      "subscriptions SeoAuditSubscription[]",
      "@@unique([userId, normalizedOrigin])",
      "@@index([normalizedOrigin])"
    ]);
    expectExactPrismaLines("SeoAuditCredit", [
      'orderId String @unique @map("order_id")',
      "user User @relation(fields: [userId], references: [id])",
      "offer SeoAuditOffer @relation(fields: [offerId], references: [id])",
      "order Order @relation(fields: [orderId], references: [id])",
      "runs SeoAuditRun[]",
      "@@index([userId, expiresAt])",
      "@@index([offerId])"
    ]);
    expectExactPrismaLines("SeoAuditSubscription", [
      "user User @relation(fields: [userId], references: [id])",
      "project SeoAuditProject @relation(fields: [projectId], references: [id])",
      "offer SeoAuditOffer @relation(fields: [offerId], references: [id])",
      "orders SeoAuditSubscriptionOrder[]",
      "schedule SeoAuditSchedule?",
      "runs SeoAuditRun[]",
      "@@index([userId, status])",
      "@@index([projectId, status])",
      "@@index([status, expiresAt])"
    ]);
    expectExactPrismaLines("SeoAuditSubscriptionOrder", [
      'orderId String @unique @map("order_id")',
      "subscription SeoAuditSubscription @relation(fields: [subscriptionId], references: [id])",
      "order Order @relation(fields: [orderId], references: [id])",
      "@@index([subscriptionId, createdAt])"
    ]);
    expectExactPrismaLines("SeoAuditSchedule", [
      'subscriptionId String @unique @map("subscription_id")',
      "subscription SeoAuditSubscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)",
      "@@index([enabled, nextRunAt])"
    ]);
    expectExactPrismaLines("SeoAuditWorkerHeartbeat", [
      'workerId String @unique @map("worker_id")',
      "@@index([lastSeenAt])"
    ]);

    const toolPurchaseUniqueConstraints = getPrismaBlock("model", "ToolPurchase").filter(
      (line) => line.startsWith("@@unique")
    );
    expect(toolPurchaseUniqueConstraints).toEqual(["@@unique([userId, toolId])"]);
  });

  it("locks public tokens, worker leases, retries, complete summaries, and private report keys", () => {
    expectExactPrismaLines("SeoAuditRun", [
      'requestIpHash String? @map("request_ip_hash") @db.Char(64)',
      'requestOriginHash String? @map("request_origin_hash") @db.Char(64)',
      'publicTokenHash String? @unique @map("public_token_hash") @db.Char(64)',
      'leaseTokenHash String? @map("lease_token_hash") @db.Char(64)',
      'leaseExpiresAt DateTime? @map("lease_expires_at")',
      'availableAt DateTime @default(now()) @map("available_at")',
      'attemptCount Int @default(0) @map("attempt_count")',
      'maxAttempts Int @default(3) @map("max_attempts")',
      'summaryScore Int? @map("summary_score")',
      'summaryEvidenceCoverage Float? @map("summary_evidence_coverage")',
      'summaryPageCount Int? @map("summary_page_count")',
      'summaryCriticalCount Int? @map("summary_critical_count")',
      'summaryHighCount Int? @map("summary_high_count")',
      'summaryMediumCount Int? @map("summary_medium_count")',
      'summaryFindings Json? @map("summary_findings")',
      'targetUrl String @map("target_url")',
      'failureMessage String? @map("failure_message")',
      'reportJsonKey String? @map("report_json_key")',
      'reportMarkdownKey String? @map("report_markdown_key")',
      'reportSha256 String? @map("report_sha256") @db.Char(64)',
      "user User? @relation(fields: [userId], references: [id], onDelete: Restrict)",
      "project SeoAuditProject? @relation(fields: [projectId], references: [id], onDelete: SetNull)",
      "offer SeoAuditOffer? @relation(fields: [offerId], references: [id], onDelete: SetNull)",
      'sourceOrder Order? @relation("SeoAuditFundedRuns", fields: [sourceOrderId], references: [id], onDelete: Restrict)',
      'upgradeOrders Order[] @relation("SeoAuditUpgradeSourceRun")',
      "credit SeoAuditCredit? @relation(fields: [creditId], references: [id], onDelete: SetNull)",
      "subscription SeoAuditSubscription? @relation(fields: [subscriptionId], references: [id], onDelete: SetNull)",
      "@@index([status, availableAt])",
      "@@index([leaseExpiresAt])",
      "@@index([userId, createdAt])",
      "@@index([projectId, createdAt])",
      "@@index([requestIpHash, createdAt])",
      "@@index([requestOriginHash, createdAt])",
      "@@index([creditId, createdAt])",
      "@@index([subscriptionId, createdAt])"
    ]);

    expect(getSqlTableLines("seo_audit_runs")).toEqual(
      expect.arrayContaining([
        '"request_ip_hash" CHAR(64)',
        '"request_origin_hash" CHAR(64)',
        '"public_token_hash" CHAR(64)',
        '"lease_token_hash" CHAR(64)',
        '"lease_expires_at" TIMESTAMP(3)',
        '"available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP',
        '"attempt_count" INTEGER NOT NULL DEFAULT 0',
        '"max_attempts" INTEGER NOT NULL DEFAULT 3',
        '"summary_score" INTEGER',
        '"summary_evidence_coverage" DOUBLE PRECISION',
        '"summary_page_count" INTEGER',
        '"summary_critical_count" INTEGER',
        '"summary_high_count" INTEGER',
        '"summary_medium_count" INTEGER',
        '"summary_findings" JSONB',
        '"target_url" TEXT NOT NULL',
        '"failure_message" TEXT',
        '"report_json_key" TEXT',
        '"report_markdown_key" TEXT',
        '"report_sha256" CHAR(64)'
      ])
    );
  });

  it("persists reservation-owned artifact uploads for idempotent cleanup", () => {
    expectExactPrismaLines("SeoAuditRun", [
      "artifactUploads SeoAuditArtifactUpload[]",
    ]);
    expectExactPrismaLines("SeoAuditArtifactUpload", [
      'runId String @map("run_id")',
      "reservation String @unique",
      'reportSha256 String @map("report_sha256") @db.Char(64)',
      'reportJsonKey String @unique @map("report_json_key")',
      'reportMarkdownKey String @unique @map("report_markdown_key")',
      'cleanupAfter DateTime @map("cleanup_after")',
      'cleanupClaimToken String? @unique @map("cleanup_claim_token")',
      'cleanupClaimedAt DateTime? @map("cleanup_claimed_at")',
      'cleanupAttemptCount Int @default(0) @map("cleanup_attempt_count")',
      "run SeoAuditRun @relation(fields: [runId], references: [id], onDelete: Restrict)",
      "@@index([cleanupAfter, cleanupClaimedAt])",
      "@@index([runId, createdAt])",
    ]);
    expect(getSqlTableLines("seo_audit_artifact_uploads", artifactUploadMigration)).toEqual(
      expect.arrayContaining([
        '"run_id" TEXT NOT NULL',
        '"reservation" TEXT NOT NULL',
        '"report_sha256" CHAR(64) NOT NULL',
        '"report_json_key" TEXT NOT NULL',
        '"report_markdown_key" TEXT NOT NULL',
        '"cleanup_after" TIMESTAMP(3) NOT NULL',
        '"cleanup_claim_token" TEXT',
        '"cleanup_claimed_at" TIMESTAMP(3)',
        '"cleanup_attempt_count" INTEGER NOT NULL DEFAULT 0',
      ]),
    );
    expect(artifactUploadMigration).toContain("ON DELETE RESTRICT ON UPDATE CASCADE");
  });

  it("creates exactly the eight audit tables and the required unique and lookup indexes", () => {
    const tableNames = [
      ...commercialMigration.matchAll(/CREATE TABLE "(seo_audit_[^"]+)"/g)
    ].map((match) => match[1]);
    expect(tableNames).toEqual([
      "seo_audit_offers",
      "seo_audit_projects",
      "seo_audit_credits",
      "seo_audit_subscriptions",
      "seo_audit_subscription_orders",
      "seo_audit_schedules",
      "seo_audit_runs",
      "seo_audit_worker_heartbeats"
    ]);

    const indexes = getMigrationIndexes().filter(
      (index) =>
        index.table.startsWith("seo_audit_") || index.name.startsWith("orders_seo_audit_")
    );
    expect(indexes).toEqual([
      { unique: true, name: "seo_audit_offers_code_key", table: "seo_audit_offers", columns: ["code"] },
      { unique: false, name: "seo_audit_offers_status_idx", table: "seo_audit_offers", columns: ["status"] },
      { unique: true, name: "seo_audit_projects_user_id_normalized_origin_key", table: "seo_audit_projects", columns: ["user_id", "normalized_origin"] },
      { unique: false, name: "seo_audit_projects_normalized_origin_idx", table: "seo_audit_projects", columns: ["normalized_origin"] },
      { unique: true, name: "seo_audit_credits_order_id_key", table: "seo_audit_credits", columns: ["order_id"] },
      { unique: false, name: "seo_audit_credits_user_id_expires_at_idx", table: "seo_audit_credits", columns: ["user_id", "expires_at"] },
      { unique: false, name: "seo_audit_credits_offer_id_idx", table: "seo_audit_credits", columns: ["offer_id"] },
      { unique: false, name: "seo_audit_subscriptions_user_id_status_idx", table: "seo_audit_subscriptions", columns: ["user_id", "status"] },
      { unique: false, name: "seo_audit_subscriptions_project_id_status_idx", table: "seo_audit_subscriptions", columns: ["project_id", "status"] },
      { unique: false, name: "seo_audit_subscriptions_status_expires_at_idx", table: "seo_audit_subscriptions", columns: ["status", "expires_at"] },
      { unique: true, name: "seo_audit_subscription_orders_order_id_key", table: "seo_audit_subscription_orders", columns: ["order_id"] },
      { unique: false, name: "seo_audit_subscription_orders_subscription_id_created_at_idx", table: "seo_audit_subscription_orders", columns: ["subscription_id", "created_at"] },
      { unique: true, name: "seo_audit_schedules_subscription_id_key", table: "seo_audit_schedules", columns: ["subscription_id"] },
      { unique: false, name: "seo_audit_schedules_enabled_next_run_at_idx", table: "seo_audit_schedules", columns: ["enabled", "next_run_at"] },
      { unique: true, name: "seo_audit_runs_public_token_hash_key", table: "seo_audit_runs", columns: ["public_token_hash"] },
      { unique: false, name: "seo_audit_runs_status_available_at_idx", table: "seo_audit_runs", columns: ["status", "available_at"] },
      { unique: false, name: "seo_audit_runs_lease_expires_at_idx", table: "seo_audit_runs", columns: ["lease_expires_at"] },
      { unique: false, name: "seo_audit_runs_user_id_created_at_idx", table: "seo_audit_runs", columns: ["user_id", "created_at"] },
      { unique: false, name: "seo_audit_runs_project_id_created_at_idx", table: "seo_audit_runs", columns: ["project_id", "created_at"] },
      { unique: false, name: "seo_audit_runs_request_ip_hash_created_at_idx", table: "seo_audit_runs", columns: ["request_ip_hash", "created_at"] },
      { unique: false, name: "seo_audit_runs_request_origin_hash_created_at_idx", table: "seo_audit_runs", columns: ["request_origin_hash", "created_at"] },
      { unique: false, name: "seo_audit_runs_credit_id_created_at_idx", table: "seo_audit_runs", columns: ["credit_id", "created_at"] },
      { unique: false, name: "seo_audit_runs_subscription_id_created_at_idx", table: "seo_audit_runs", columns: ["subscription_id", "created_at"] },
      { unique: true, name: "seo_audit_worker_heartbeats_worker_id_key", table: "seo_audit_worker_heartbeats", columns: ["worker_id"] },
      { unique: false, name: "seo_audit_worker_heartbeats_last_seen_at_idx", table: "seo_audit_worker_heartbeats", columns: ["last_seen_at"] },
      { unique: false, name: "orders_seo_audit_offer_id_order_status_idx", table: "orders", columns: ["seo_audit_offer_id", "order_status"] },
      { unique: false, name: "orders_seo_audit_source_run_id_idx", table: "orders", columns: ["seo_audit_source_run_id"] }
    ]);
  });

  it("adds exactly three order columns and preserves the key foreign-key relationships", () => {
    const statements = getSqlStatements(commercialMigration);
    const orderColumnStatement = statements.find(
      (statement) => statement.startsWith('ALTER TABLE "orders" ADD COLUMN')
    );
    expect(orderColumnStatement).toBeDefined();
    expect(
      [...orderColumnStatement!.matchAll(/ADD COLUMN "([^"]+)" ([^,]+)/g)].map(
        (match) => ({ name: match[1], type: normalizeWhitespace(match[2]) })
      )
    ).toEqual([
      { name: "seo_audit_offer_id", type: "TEXT" },
      { name: "seo_audit_target_origin", type: "TEXT" },
      { name: "seo_audit_source_run_id", type: "TEXT" }
    ]);

    expect(statements).toEqual(
      expect.arrayContaining([
        'ALTER TABLE "orders" ADD CONSTRAINT "orders_seo_audit_offer_id_fkey" FOREIGN KEY ("seo_audit_offer_id") REFERENCES "seo_audit_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE',
        'ALTER TABLE "orders" ADD CONSTRAINT "orders_seo_audit_source_run_id_fkey" FOREIGN KEY ("seo_audit_source_run_id") REFERENCES "seo_audit_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE',
        'ALTER TABLE "seo_audit_credits" ADD CONSTRAINT "seo_audit_credits_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE',
        'ALTER TABLE "seo_audit_subscription_orders" ADD CONSTRAINT "seo_audit_subscription_orders_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "seo_audit_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE',
        'ALTER TABLE "seo_audit_subscription_orders" ADD CONSTRAINT "seo_audit_subscription_orders_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE',
        'ALTER TABLE "seo_audit_schedules" ADD CONSTRAINT "seo_audit_schedules_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "seo_audit_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE',
        'ALTER TABLE "seo_audit_runs" ADD CONSTRAINT "seo_audit_runs_source_order_id_fkey" FOREIGN KEY ("source_order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE',
        'ALTER TABLE "seo_audit_runs" ADD CONSTRAINT "seo_audit_runs_credit_id_fkey" FOREIGN KEY ("credit_id") REFERENCES "seo_audit_credits"("id") ON DELETE SET NULL ON UPDATE CASCADE',
        'ALTER TABLE "seo_audit_runs" ADD CONSTRAINT "seo_audit_runs_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "seo_audit_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE'
      ])
    );
  });

  it("seeds exactly the four server-owned offers with exact commercial limits", () => {
    const rows = getOfferSeedRows().map((row) => ({
      id: row.id,
      code: row.code,
      orderType: row.order_type,
      regularPrice: row.regular_price,
      launchPrice: row.launch_price,
      launchEndsAt: row.launch_ends_at,
      launchQuantityLimit: row.launch_quantity_limit,
      pageLimit: row.page_limit,
      includedRuns: row.included_runs,
      validityDays: row.validity_days,
      publicFindingLimit: row.public_finding_limit,
      maxScheduledRuns: row.max_scheduled_runs,
      manualRuns: row.manual_runs
    }));

    expect(rows).toEqual([
      {
        id: "seo-audit-free",
        code: "free",
        orderType: null,
        regularPrice: "0.00",
        launchPrice: null,
        launchEndsAt: null,
        launchQuantityLimit: null,
        pageLimit: "10",
        includedRuns: "1",
        validityDays: "1",
        publicFindingLimit: "3",
        maxScheduledRuns: null,
        manualRuns: null
      },
      {
        id: "seo-audit-professional",
        code: "professional",
        orderType: "seo_audit_credit",
        regularPrice: "19.90",
        launchPrice: "9.90",
        launchEndsAt: "TIMESTAMP '2026-08-23 16:00:00'",
        launchQuantityLimit: "100",
        pageLimit: "100",
        includedRuns: "2",
        validityDays: "7",
        publicFindingLimit: null,
        maxScheduledRuns: null,
        manualRuns: null
      },
      {
        id: "seo-audit-deep",
        code: "deep",
        orderType: "seo_audit_credit",
        regularPrice: "39.90",
        launchPrice: null,
        launchEndsAt: null,
        launchQuantityLimit: null,
        pageLimit: "300",
        includedRuns: "3",
        validityDays: "30",
        publicFindingLimit: null,
        maxScheduledRuns: null,
        manualRuns: null
      },
      {
        id: "seo-audit-monitoring",
        code: "monitoring",
        orderType: "seo_audit_monitoring",
        regularPrice: "109.90",
        launchPrice: null,
        launchEndsAt: null,
        launchQuantityLimit: null,
        pageLimit: "100",
        includedRuns: null,
        validityDays: "30",
        publicFindingLimit: null,
        maxScheduledRuns: "5",
        manualRuns: "2"
      }
    ]);
  });

  it("wraps each migration in exactly one explicit transaction", () => {
    for (const migration of [orderTypeMigration, commercialMigration]) {
      const statements = getSqlStatements(migration);
      expect(statements[0]).toBe("BEGIN");
      expect(statements.at(-1)).toBe("COMMIT");
      expect(statements.filter((statement) => statement === "BEGIN")).toHaveLength(1);
      expect(statements.filter((statement) => statement === "COMMIT")).toHaveLength(1);
    }
  });

  it("commits the two enum values in the earlier migration and never repeats ADD VALUE", () => {
    expect(
      basename(dirname(orderTypeMigrationPath)).localeCompare(
        basename(dirname(commercialMigrationPath))
      )
    ).toBeLessThan(0);
    expect(getSqlStatements(orderTypeMigration).slice(1, -1)).toEqual([
      'ALTER TYPE "OrderType" ADD VALUE \'seo_audit_credit\'',
      'ALTER TYPE "OrderType" ADD VALUE \'seo_audit_monitoring\''
    ]);
    expect(
      getSqlStatements(commercialMigration).filter((statement) =>
        /ALTER TYPE "OrderType" ADD VALUE/i.test(statement)
      )
    ).toEqual([]);
  });

  it("contains no destructive schema or existing-data statements", () => {
    for (const sql of [orderTypeMigration, commercialMigration]) {
      const destructiveStatements = getSqlStatements(sql).filter(
        (statement) =>
          /\bDROP\s+(?:TABLE|COLUMN)\b/i.test(statement) ||
          /^TRUNCATE\b/i.test(statement) ||
          /^DELETE\s+FROM\b/i.test(statement) ||
          /^UPDATE\s+/i.test(statement)
      );
      expect(destructiveStatements).toEqual([]);
    }
  });
});
