BEGIN;

CREATE TYPE "SeoAuditRunStatus" AS ENUM (
  'queued',
  'running',
  'completed',
  'failed',
  'cancel_requested',
  'cancelled'
);

CREATE TYPE "SeoAuditRunKind" AS ENUM (
  'free',
  'professional',
  'deep',
  'recheck',
  'scheduled'
);

CREATE TYPE "SeoAuditSubscriptionStatus" AS ENUM (
  'active',
  'paused',
  'expired',
  'refunded'
);

CREATE TYPE "SeoAuditCadence" AS ENUM ('weekly', 'biweekly', 'monthly');

ALTER TABLE "orders"
  ADD COLUMN "seo_audit_offer_id" TEXT,
  ADD COLUMN "seo_audit_target_origin" TEXT,
  ADD COLUMN "seo_audit_source_run_id" TEXT;

CREATE TABLE "seo_audit_offers" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "name_en" TEXT,
  "order_type" "OrderType",
  "regular_price" DECIMAL(10, 2) NOT NULL,
  "launch_price" DECIMAL(10, 2),
  "launch_ends_at" TIMESTAMP(3),
  "launch_quantity_limit" INTEGER,
  "page_limit" INTEGER NOT NULL,
  "included_runs" INTEGER,
  "validity_days" INTEGER NOT NULL,
  "public_finding_limit" INTEGER,
  "max_scheduled_runs" INTEGER,
  "manual_runs" INTEGER,
  "status" "PlanStatus" NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "seo_audit_offers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "seo_audit_projects" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "normalized_origin" TEXT NOT NULL,
  "display_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "seo_audit_projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "seo_audit_credits" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "offer_id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "run_kind" "SeoAuditRunKind" NOT NULL,
  "page_limit" INTEGER NOT NULL,
  "total_runs" INTEGER NOT NULL,
  "remaining_runs" INTEGER NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "refunded_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "seo_audit_credits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "seo_audit_subscriptions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "offer_id" TEXT NOT NULL,
  "status" "SeoAuditSubscriptionStatus" NOT NULL DEFAULT 'active',
  "starts_at" TIMESTAMP(3) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "max_scheduled_runs" INTEGER NOT NULL,
  "scheduled_runs_used" INTEGER NOT NULL DEFAULT 0,
  "manual_runs_remaining" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "seo_audit_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "seo_audit_subscription_orders" (
  "id" TEXT NOT NULL,
  "subscription_id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "service_starts_at" TIMESTAMP(3) NOT NULL,
  "service_ends_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "seo_audit_subscription_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "seo_audit_schedules" (
  "id" TEXT NOT NULL,
  "subscription_id" TEXT NOT NULL,
  "cadence" "SeoAuditCadence" NOT NULL DEFAULT 'weekly',
  "weekday" INTEGER NOT NULL DEFAULT 1,
  "hour" INTEGER NOT NULL DEFAULT 9,
  "minute" INTEGER NOT NULL DEFAULT 0,
  "time_zone" TEXT NOT NULL DEFAULT 'Asia/Shanghai',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "next_run_at" TIMESTAMP(3),
  "last_run_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "seo_audit_schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "seo_audit_runs" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "project_id" TEXT,
  "offer_id" TEXT,
  "source_order_id" TEXT,
  "credit_id" TEXT,
  "subscription_id" TEXT,
  "status" "SeoAuditRunStatus" NOT NULL DEFAULT 'queued',
  "kind" "SeoAuditRunKind" NOT NULL,
  "target_url" TEXT NOT NULL,
  "normalized_origin" TEXT NOT NULL,
  "request_ip_hash" CHAR(64),
  "request_origin_hash" CHAR(64),
  "page_limit" INTEGER NOT NULL,
  "total_timeout_seconds" INTEGER NOT NULL,
  "public_token_hash" CHAR(64),
  "public_token_expires_at" TIMESTAMP(3),
  "lease_token_hash" CHAR(64),
  "lease_expires_at" TIMESTAMP(3),
  "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 3,
  "cancel_requested_at" TIMESTAMP(3),
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "failed_at" TIMESTAMP(3),
  "failure_code" TEXT,
  "failure_message" TEXT,
  "engine_version" TEXT,
  "summary_score" INTEGER,
  "summary_evidence_coverage" DOUBLE PRECISION,
  "summary_page_count" INTEGER,
  "summary_critical_count" INTEGER,
  "summary_high_count" INTEGER,
  "summary_medium_count" INTEGER,
  "summary_findings" JSONB,
  "report_json_key" TEXT,
  "report_markdown_key" TEXT,
  "report_sha256" CHAR(64),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "seo_audit_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "seo_audit_worker_heartbeats" (
  "id" TEXT NOT NULL,
  "worker_id" TEXT NOT NULL,
  "engine_version" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "current_run_id" TEXT,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "seo_audit_worker_heartbeats_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "seo_audit_offers_code_key" ON "seo_audit_offers"("code");
CREATE INDEX "seo_audit_offers_status_idx" ON "seo_audit_offers"("status");

INSERT INTO "seo_audit_offers" (
  "id",
  "code",
  "name",
  "name_en",
  "order_type",
  "regular_price",
  "launch_price",
  "launch_ends_at",
  "launch_quantity_limit",
  "page_limit",
  "included_runs",
  "validity_days",
  "public_finding_limit",
  "max_scheduled_runs",
  "manual_runs",
  "updated_at"
) VALUES
  (
    'seo-audit-free',
    'free',
    '免费快速巡检',
    'Free Quick Audit',
    NULL,
    0.00,
    NULL,
    NULL,
    NULL,
    10,
    1,
    1,
    3,
    NULL,
    NULL,
    CURRENT_TIMESTAMP
  ),
  (
    'seo-audit-professional',
    'professional',
    '专业巡检',
    'Professional Audit',
    'seo_audit_credit',
    19.90,
    9.90,
    TIMESTAMP '2026-08-23 16:00:00',
    100,
    100,
    2,
    7,
    NULL,
    NULL,
    NULL,
    CURRENT_TIMESTAMP
  ),
  (
    'seo-audit-deep',
    'deep',
    '深度巡检 Beta',
    'Deep Audit Beta',
    'seo_audit_credit',
    39.90,
    NULL,
    NULL,
    NULL,
    300,
    3,
    30,
    NULL,
    NULL,
    NULL,
    CURRENT_TIMESTAMP
  ),
  (
    'seo-audit-monitoring',
    'monitoring',
    '持续监控 30 天',
    '30-Day Monitoring',
    'seo_audit_monitoring',
    109.90,
    NULL,
    NULL,
    NULL,
    100,
    NULL,
    30,
    NULL,
    5,
    2,
    CURRENT_TIMESTAMP
  );

CREATE UNIQUE INDEX "seo_audit_projects_user_id_normalized_origin_key"
  ON "seo_audit_projects"("user_id", "normalized_origin");
CREATE INDEX "seo_audit_projects_normalized_origin_idx"
  ON "seo_audit_projects"("normalized_origin");

CREATE UNIQUE INDEX "seo_audit_credits_order_id_key" ON "seo_audit_credits"("order_id");
CREATE INDEX "seo_audit_credits_user_id_expires_at_idx"
  ON "seo_audit_credits"("user_id", "expires_at");
CREATE INDEX "seo_audit_credits_offer_id_idx" ON "seo_audit_credits"("offer_id");

CREATE INDEX "seo_audit_subscriptions_user_id_status_idx"
  ON "seo_audit_subscriptions"("user_id", "status");
CREATE INDEX "seo_audit_subscriptions_project_id_status_idx"
  ON "seo_audit_subscriptions"("project_id", "status");
CREATE INDEX "seo_audit_subscriptions_status_expires_at_idx"
  ON "seo_audit_subscriptions"("status", "expires_at");

CREATE UNIQUE INDEX "seo_audit_subscription_orders_order_id_key"
  ON "seo_audit_subscription_orders"("order_id");
CREATE INDEX "seo_audit_subscription_orders_subscription_id_created_at_idx"
  ON "seo_audit_subscription_orders"("subscription_id", "created_at");

CREATE UNIQUE INDEX "seo_audit_schedules_subscription_id_key"
  ON "seo_audit_schedules"("subscription_id");
CREATE INDEX "seo_audit_schedules_enabled_next_run_at_idx"
  ON "seo_audit_schedules"("enabled", "next_run_at");

CREATE UNIQUE INDEX "seo_audit_runs_public_token_hash_key"
  ON "seo_audit_runs"("public_token_hash");
CREATE INDEX "seo_audit_runs_status_available_at_idx"
  ON "seo_audit_runs"("status", "available_at");
CREATE INDEX "seo_audit_runs_lease_expires_at_idx"
  ON "seo_audit_runs"("lease_expires_at");
CREATE INDEX "seo_audit_runs_user_id_created_at_idx"
  ON "seo_audit_runs"("user_id", "created_at");
CREATE INDEX "seo_audit_runs_project_id_created_at_idx"
  ON "seo_audit_runs"("project_id", "created_at");
CREATE INDEX "seo_audit_runs_request_ip_hash_created_at_idx"
  ON "seo_audit_runs"("request_ip_hash", "created_at");
CREATE INDEX "seo_audit_runs_request_origin_hash_created_at_idx"
  ON "seo_audit_runs"("request_origin_hash", "created_at");
CREATE INDEX "seo_audit_runs_credit_id_created_at_idx"
  ON "seo_audit_runs"("credit_id", "created_at");
CREATE INDEX "seo_audit_runs_subscription_id_created_at_idx"
  ON "seo_audit_runs"("subscription_id", "created_at");

CREATE UNIQUE INDEX "seo_audit_worker_heartbeats_worker_id_key"
  ON "seo_audit_worker_heartbeats"("worker_id");
CREATE INDEX "seo_audit_worker_heartbeats_last_seen_at_idx"
  ON "seo_audit_worker_heartbeats"("last_seen_at");

CREATE INDEX "orders_seo_audit_offer_id_order_status_idx"
  ON "orders"("seo_audit_offer_id", "order_status");
CREATE INDEX "orders_seo_audit_source_run_id_idx"
  ON "orders"("seo_audit_source_run_id");

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_seo_audit_offer_id_fkey"
  FOREIGN KEY ("seo_audit_offer_id") REFERENCES "seo_audit_offers"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_seo_audit_source_run_id_fkey"
  FOREIGN KEY ("seo_audit_source_run_id") REFERENCES "seo_audit_runs"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "seo_audit_projects"
  ADD CONSTRAINT "seo_audit_projects_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "seo_audit_credits"
  ADD CONSTRAINT "seo_audit_credits_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "seo_audit_credits"
  ADD CONSTRAINT "seo_audit_credits_offer_id_fkey"
  FOREIGN KEY ("offer_id") REFERENCES "seo_audit_offers"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "seo_audit_credits"
  ADD CONSTRAINT "seo_audit_credits_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "seo_audit_subscriptions"
  ADD CONSTRAINT "seo_audit_subscriptions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "seo_audit_subscriptions"
  ADD CONSTRAINT "seo_audit_subscriptions_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "seo_audit_projects"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "seo_audit_subscriptions"
  ADD CONSTRAINT "seo_audit_subscriptions_offer_id_fkey"
  FOREIGN KEY ("offer_id") REFERENCES "seo_audit_offers"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "seo_audit_subscription_orders"
  ADD CONSTRAINT "seo_audit_subscription_orders_subscription_id_fkey"
  FOREIGN KEY ("subscription_id") REFERENCES "seo_audit_subscriptions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "seo_audit_subscription_orders"
  ADD CONSTRAINT "seo_audit_subscription_orders_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "seo_audit_schedules"
  ADD CONSTRAINT "seo_audit_schedules_subscription_id_fkey"
  FOREIGN KEY ("subscription_id") REFERENCES "seo_audit_subscriptions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "seo_audit_runs"
  ADD CONSTRAINT "seo_audit_runs_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "seo_audit_runs"
  ADD CONSTRAINT "seo_audit_runs_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "seo_audit_projects"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "seo_audit_runs"
  ADD CONSTRAINT "seo_audit_runs_offer_id_fkey"
  FOREIGN KEY ("offer_id") REFERENCES "seo_audit_offers"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "seo_audit_runs"
  ADD CONSTRAINT "seo_audit_runs_source_order_id_fkey"
  FOREIGN KEY ("source_order_id") REFERENCES "orders"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "seo_audit_runs"
  ADD CONSTRAINT "seo_audit_runs_credit_id_fkey"
  FOREIGN KEY ("credit_id") REFERENCES "seo_audit_credits"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "seo_audit_runs"
  ADD CONSTRAINT "seo_audit_runs_subscription_id_fkey"
  FOREIGN KEY ("subscription_id") REFERENCES "seo_audit_subscriptions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
