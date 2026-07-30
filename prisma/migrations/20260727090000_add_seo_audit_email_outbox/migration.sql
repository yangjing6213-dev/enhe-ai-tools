-- CreateEnum
CREATE TYPE "SeoAuditEmailOutboxStatus" AS ENUM ('pending', 'sending', 'sent', 'discarded');

-- AlterTable
ALTER TABLE "seo_audit_runs"
ADD COLUMN "completion_notification_prepared_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "seo_audit_email_outbox" (
    "id" TEXT NOT NULL,
    "notification_id" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "text_body" TEXT NOT NULL,
    "html_body" TEXT NOT NULL,
    "status" "SeoAuditEmailOutboxStatus" NOT NULL DEFAULT 'pending',
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lease_token" TEXT,
    "lease_expires_at" TIMESTAMP(3),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "sent_at" TIMESTAMP(3),
    "last_error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_audit_email_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seo_audit_email_outbox_notification_id_key" ON "seo_audit_email_outbox"("notification_id");

-- CreateIndex
CREATE UNIQUE INDEX "seo_audit_email_outbox_lease_token_key" ON "seo_audit_email_outbox"("lease_token");

-- CreateIndex
CREATE INDEX "seo_audit_email_outbox_status_available_at_idx" ON "seo_audit_email_outbox"("status", "available_at");

-- CreateIndex
CREATE INDEX "seo_audit_email_outbox_lease_expires_at_idx" ON "seo_audit_email_outbox"("lease_expires_at");

-- AddForeignKey
ALTER TABLE "seo_audit_email_outbox" ADD CONSTRAINT "seo_audit_email_outbox_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
