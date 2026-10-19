ALTER TABLE "ai_workflow_batches"
ADD COLUMN "trigger_type" TEXT NOT NULL DEFAULT 'scheduled',
ADD COLUMN "last_run_date" DATE,
ADD COLUMN "lease_owner_id" TEXT,
  ADD COLUMN "lease_token_hash" TEXT,
  ADD COLUMN "lease_expires_at" TIMESTAMP(3),
  ADD COLUMN "last_heartbeat_at" TIMESTAMP(3),
  ADD COLUMN "last_worker_stage" TEXT;

ALTER TABLE "ai_workflow_candidates"
  ADD COLUMN "failure_reason" TEXT;

CREATE INDEX "ai_workflow_batches_lease_expires_at_idx"
  ON "ai_workflow_batches"("lease_expires_at");
