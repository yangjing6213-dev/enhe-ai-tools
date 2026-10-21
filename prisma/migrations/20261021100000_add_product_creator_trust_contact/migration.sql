-- Add optional product creator, manual trust review, and notification sender data.
-- Existing products are intentionally left unattributed and unreviewed.
ALTER TABLE "users" ADD COLUMN "creator_bio" TEXT;
ALTER TABLE "tools" ADD COLUMN "creator_id" TEXT;
ALTER TABLE "tools" ADD COLUMN "security_reviewed_at" TIMESTAMP(3);
ALTER TABLE "notifications" ADD COLUMN "sender_id" TEXT;

CREATE INDEX "tools_creator_id_type_status_idx" ON "tools"("creator_id", "type", "status");
CREATE INDEX "notifications_sender_id_type_created_at_idx" ON "notifications"("sender_id", "type", "created_at");

ALTER TABLE "tools" ADD CONSTRAINT "tools_creator_id_fkey"
  FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_sender_id_fkey"
  FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
