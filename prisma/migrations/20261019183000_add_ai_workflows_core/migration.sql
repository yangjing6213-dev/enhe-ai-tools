ALTER TYPE "ToolType" ADD VALUE 'ai_workflow';

CREATE TYPE "AiWorkflowBatchStatus" AS ENUM ('queued', 'running', 'completed', 'partial', 'failed', 'paused');
CREATE TYPE "AiWorkflowCandidateStatus" AS ENUM ('discovered', 'downloading', 'reviewing', 'validated', 'rejected', 'failed', 'pending_pricing', 'published');
CREATE TYPE "AiWorkflowPriceDecision" AS ENUM ('paid', 'free');

ALTER TABLE "files"
  ADD COLUMN "storage_bucket" TEXT,
  ADD COLUMN "storage_region" TEXT,
  ADD COLUMN "object_key" TEXT,
  ADD COLUMN "sha256" TEXT;

ALTER TABLE "orders" ADD COLUMN "tool_file_id" TEXT;
ALTER TABLE "tool_purchases" ADD COLUMN "file_id" TEXT;

CREATE TABLE "ai_workflow_topics" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "english_name" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_workflow_topics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_workflow_collection_settings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "is_enabled" BOOLEAN NOT NULL DEFAULT false,
  "is_paused" BOOLEAN NOT NULL DEFAULT false,
  "schedule_time" TEXT NOT NULL DEFAULT '09:00',
  "time_zone" TEXT NOT NULL DEFAULT 'Asia/Shanghai',
  "topic_list_version" INTEGER NOT NULL DEFAULT 0,
  "scheduled_task_registered_at" TIMESTAMP(3),
  "scheduled_task_enabled_at" TIMESTAMP(3),
  "first_unattended_success_at" TIMESTAMP(3),
  "last_worker_seen_at" TIMESTAMP(3),
  "last_successful_run_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_workflow_collection_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_workflow_batches" (
  "id" TEXT NOT NULL,
  "batch_date" DATE NOT NULL,
  "topic_id" TEXT,
  "topic_name_snapshot" TEXT NOT NULL,
  "topic_order_version" INTEGER NOT NULL,
  "status" "AiWorkflowBatchStatus" NOT NULL DEFAULT 'queued',
  "checkpoint" JSONB NOT NULL DEFAULT '{}',
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "failure_reason" TEXT,
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_workflow_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_workflow_candidates" (
  "id" TEXT NOT NULL,
  "batch_id" TEXT NOT NULL,
  "topic_id" TEXT,
  "repository_id" TEXT NOT NULL,
  "source_fingerprint" TEXT NOT NULL,
  "repository_url" TEXT NOT NULL,
  "repository_owner" TEXT NOT NULL,
  "repository_name" TEXT NOT NULL,
  "commit_sha" TEXT,
    "license_spdx" TEXT,
    "license_url" TEXT,
    "project_type" TEXT NOT NULL DEFAULT 'workflow',
    "verified_environments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "github_stars" INTEGER,
  "stars_updated_at" TIMESTAMP(3),
  "validation_report" JSONB,
  "modification_summary" TEXT,
  "file_id" TEXT,
  "package_version" TEXT,
  "package_size" BIGINT,
  "package_sha256" TEXT,
    "price_suggestion" DECIMAL(10,2),
    "price_rationale" JSONB,
  "price_decision" "AiWorkflowPriceDecision",
  "confirmed_price" DECIMAL(10,2),
  "pricing_approver_id" TEXT,
  "pricing_approved_at" TIMESTAMP(3),
  "status" "AiWorkflowCandidateStatus" NOT NULL DEFAULT 'discovered',
  "tool_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_workflow_candidates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_workflow_favorites" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "tool_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_workflow_favorites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_workflow_reviews" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "tool_id" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "content" TEXT,
  "status" "CommentStatus" NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_workflow_reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_workflow_reviews_rating_check" CHECK ("rating" >= 1 AND "rating" <= 5)
);

CREATE TABLE "ai_workflow_download_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "tool_id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "visitor_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_workflow_download_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_workflow_version_purchases" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "tool_id" TEXT NOT NULL,
  "file_id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_workflow_version_purchases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_workflow_topics_slug_key" ON "ai_workflow_topics"("slug");
CREATE UNIQUE INDEX "ai_workflow_batches_batch_date_key" ON "ai_workflow_batches"("batch_date");
CREATE INDEX "ai_workflow_batches_status_batch_date_idx" ON "ai_workflow_batches"("status", "batch_date");
CREATE UNIQUE INDEX "ai_workflow_candidates_repository_id_key" ON "ai_workflow_candidates"("repository_id");
CREATE UNIQUE INDEX "ai_workflow_candidates_source_fingerprint_key" ON "ai_workflow_candidates"("source_fingerprint");
CREATE UNIQUE INDEX "ai_workflow_candidates_file_id_key" ON "ai_workflow_candidates"("file_id");
CREATE UNIQUE INDEX "ai_workflow_candidates_tool_id_key" ON "ai_workflow_candidates"("tool_id");
CREATE INDEX "ai_workflow_candidates_batch_id_status_idx" ON "ai_workflow_candidates"("batch_id", "status");
CREATE INDEX "ai_workflow_candidates_topic_id_status_idx" ON "ai_workflow_candidates"("topic_id", "status");
CREATE INDEX "ai_workflow_topics_is_enabled_sort_order_idx" ON "ai_workflow_topics"("is_enabled", "sort_order");
CREATE UNIQUE INDEX "ai_workflow_favorites_user_id_tool_id_key" ON "ai_workflow_favorites"("user_id", "tool_id");
CREATE INDEX "ai_workflow_favorites_tool_id_created_at_idx" ON "ai_workflow_favorites"("tool_id", "created_at");
CREATE UNIQUE INDEX "ai_workflow_reviews_user_id_tool_id_key" ON "ai_workflow_reviews"("user_id", "tool_id");
CREATE INDEX "ai_workflow_reviews_tool_id_status_created_at_idx" ON "ai_workflow_reviews"("tool_id", "status", "created_at");
CREATE UNIQUE INDEX "ai_workflow_download_events_tool_id_file_id_visitor_key_key" ON "ai_workflow_download_events"("tool_id", "file_id", "visitor_key");
CREATE INDEX "ai_workflow_download_events_tool_id_created_at_idx" ON "ai_workflow_download_events"("tool_id", "created_at");
CREATE UNIQUE INDEX "ai_workflow_version_purchases_order_id_key" ON "ai_workflow_version_purchases"("order_id");
CREATE INDEX "ai_workflow_version_purchases_user_id_tool_id_created_at_idx" ON "ai_workflow_version_purchases"("user_id", "tool_id", "created_at");

ALTER TABLE "orders" ADD CONSTRAINT "orders_tool_file_id_fkey" FOREIGN KEY ("tool_file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tool_purchases" ADD CONSTRAINT "tool_purchases_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_workflow_batches" ADD CONSTRAINT "ai_workflow_batches_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "ai_workflow_topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_workflow_candidates" ADD CONSTRAINT "ai_workflow_candidates_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "ai_workflow_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_workflow_candidates" ADD CONSTRAINT "ai_workflow_candidates_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "ai_workflow_topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_workflow_candidates" ADD CONSTRAINT "ai_workflow_candidates_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_workflow_candidates" ADD CONSTRAINT "ai_workflow_candidates_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_workflow_candidates" ADD CONSTRAINT "ai_workflow_candidates_pricing_approver_id_fkey" FOREIGN KEY ("pricing_approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_workflow_favorites" ADD CONSTRAINT "ai_workflow_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_workflow_favorites" ADD CONSTRAINT "ai_workflow_favorites_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_workflow_reviews" ADD CONSTRAINT "ai_workflow_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_workflow_reviews" ADD CONSTRAINT "ai_workflow_reviews_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_workflow_download_events" ADD CONSTRAINT "ai_workflow_download_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_workflow_download_events" ADD CONSTRAINT "ai_workflow_download_events_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_workflow_download_events" ADD CONSTRAINT "ai_workflow_download_events_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_workflow_version_purchases" ADD CONSTRAINT "ai_workflow_version_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_workflow_version_purchases" ADD CONSTRAINT "ai_workflow_version_purchases_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_workflow_version_purchases" ADD CONSTRAINT "ai_workflow_version_purchases_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_workflow_version_purchases" ADD CONSTRAINT "ai_workflow_version_purchases_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
