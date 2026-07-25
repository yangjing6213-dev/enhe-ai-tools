BEGIN;

CREATE TABLE "seo_audit_artifact_uploads" (
  "id" TEXT NOT NULL,
  "run_id" TEXT NOT NULL,
  "reservation" TEXT NOT NULL,
  "report_sha256" CHAR(64) NOT NULL,
  "report_json_key" TEXT NOT NULL,
  "report_markdown_key" TEXT NOT NULL,
  "cleanup_after" TIMESTAMP(3) NOT NULL,
  "cleanup_claim_token" TEXT,
  "cleanup_claimed_at" TIMESTAMP(3),
  "cleanup_attempt_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "seo_audit_artifact_uploads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "seo_audit_artifact_uploads_reservation_key"
  ON "seo_audit_artifact_uploads"("reservation");
CREATE UNIQUE INDEX "seo_audit_artifact_uploads_report_json_key_key"
  ON "seo_audit_artifact_uploads"("report_json_key");
CREATE UNIQUE INDEX "seo_audit_artifact_uploads_report_markdown_key_key"
  ON "seo_audit_artifact_uploads"("report_markdown_key");
CREATE UNIQUE INDEX "seo_audit_artifact_uploads_cleanup_claim_token_key"
  ON "seo_audit_artifact_uploads"("cleanup_claim_token");
CREATE INDEX "seo_audit_artifact_uploads_cleanup_after_cleanup_claimed_at_idx"
  ON "seo_audit_artifact_uploads"("cleanup_after", "cleanup_claimed_at");
CREATE INDEX "seo_audit_artifact_uploads_run_id_created_at_idx"
  ON "seo_audit_artifact_uploads"("run_id", "created_at");

ALTER TABLE "seo_audit_artifact_uploads"
  ADD CONSTRAINT "seo_audit_artifact_uploads_run_id_fkey"
  FOREIGN KEY ("run_id") REFERENCES "seo_audit_runs"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
