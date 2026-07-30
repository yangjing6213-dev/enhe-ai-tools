BEGIN;

ALTER TABLE "seo_audit_schedules"
ADD COLUMN "notification_email" TEXT;

COMMIT;
