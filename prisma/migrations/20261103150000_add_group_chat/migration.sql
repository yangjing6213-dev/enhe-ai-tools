-- CreateEnum
CREATE TYPE "chat_group_visibility" AS ENUM ('listed', 'invite_only');

-- CreateEnum
CREATE TYPE "chat_group_status" AS ENUM ('active', 'archived', 'disabled');

-- CreateEnum
CREATE TYPE "chat_group_member_status" AS ENUM ('active', 'left', 'removed', 'banned');

-- CreateEnum
CREATE TYPE "chat_group_application_status" AS ENUM ('pending', 'approved', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "chat_group_message_status" AS ENUM ('active', 'retracted', 'removed');

-- CreateTable
CREATE TABLE "chat_groups" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar_media_id" TEXT,
    "description" TEXT NOT NULL,
    "rules" TEXT NOT NULL,
    "visibility" "chat_group_visibility" NOT NULL DEFAULT 'listed',
    "allow_member_invites" BOOLEAN NOT NULL DEFAULT true,
    "pause_joins" BOOLEAN NOT NULL DEFAULT false,
    "max_members" INTEGER NOT NULL DEFAULT 500,
    "active_member_count" INTEGER NOT NULL DEFAULT 1,
    "status" "chat_group_status" NOT NULL DEFAULT 'active',
    "read_only" BOOLEAN NOT NULL DEFAULT false,
    "last_sequence" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_group_members" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "status" "chat_group_member_status" NOT NULL DEFAULT 'active',
    "muted" BOOLEAN NOT NULL DEFAULT false,
      "muted_until" TIMESTAMP(3),
    "last_read_sequence" INTEGER NOT NULL DEFAULT 0,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status_changed_at" TIMESTAMP(3),

    CONSTRAINT "chat_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_group_applications" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "chat_group_application_status" NOT NULL DEFAULT 'pending',
    "reason" TEXT NOT NULL DEFAULT '',
    "rejection_reason" TEXT,
    "source_invite_id" TEXT,
    "reviewed_by_id" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_group_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_group_invites" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "token_ciphertext" TEXT NOT NULL,
    "paused_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "reset_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_group_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_group_messages" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "client_message_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "emoji_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mention_everyone" BOOLEAN NOT NULL DEFAULT false,
    "reply_to_message_id" TEXT,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "status" "chat_group_message_status" NOT NULL DEFAULT 'active',
    "pinned_at" TIMESTAMP(3),
    "retracted_at" TIMESTAMP(3),
    "removed_at" TIMESTAMP(3),
    "removed_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_group_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_group_media" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "message_id" TEXT,
    "original_name" TEXT NOT NULL,
    "original_bytes" INTEGER NOT NULL,
    "file_path" TEXT NOT NULL,
    "thumbnail_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "thumbnail_size" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'message',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "discarded_at" TIMESTAMP(3),

    CONSTRAINT "chat_group_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_group_message_mentions" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_group_message_mentions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_group_events" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "message_id" TEXT,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_group_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_group_reports" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resolved_by_id" TEXT,
    "resolution" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "chat_group_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_group_announcements" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "updated_by_id" TEXT NOT NULL,
    "media_id" TEXT,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_group_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_group_emojis" (
    "id" TEXT NOT NULL,
    "shortcode" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '表情',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_group_emojis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_group_audit_logs" (
    "id" TEXT NOT NULL,
    "group_id" TEXT,
    "admin_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_id" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_group_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_group_rate_limits" (
    "id" TEXT NOT NULL,
    "actor_key" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "chat_group_rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_groups_status_visibility_created_at_idx" ON "chat_groups"("status", "visibility", "created_at");

-- CreateIndex
CREATE INDEX "chat_groups_owner_id_status_idx" ON "chat_groups"("owner_id", "status");

-- CreateIndex
CREATE INDEX "chat_group_members_user_id_status_joined_at_idx" ON "chat_group_members"("user_id", "status", "joined_at");

-- CreateIndex
CREATE INDEX "chat_group_members_group_id_status_role_idx" ON "chat_group_members"("group_id", "status", "role");

-- CreateIndex
CREATE UNIQUE INDEX "chat_group_members_group_id_user_id_key" ON "chat_group_members"("group_id", "user_id");

-- CreateIndex
CREATE INDEX "chat_group_applications_group_id_status_submitted_at_idx" ON "chat_group_applications"("group_id", "status", "submitted_at");

-- CreateIndex
CREATE INDEX "chat_group_applications_user_id_submitted_at_idx" ON "chat_group_applications"("user_id", "submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX "chat_group_invites_group_id_key" ON "chat_group_invites"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_group_invites_token_hash_key" ON "chat_group_invites"("token_hash");

-- CreateIndex
CREATE INDEX "chat_group_invites_expires_at_paused_at_idx" ON "chat_group_invites"("expires_at", "paused_at");

-- CreateIndex
CREATE INDEX "chat_group_messages_group_id_status_created_at_idx" ON "chat_group_messages"("group_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "chat_group_messages_sender_id_created_at_idx" ON "chat_group_messages"("sender_id", "created_at");

-- CreateIndex
CREATE INDEX "chat_group_messages_reference_type_reference_id_idx" ON "chat_group_messages"("reference_type", "reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_group_messages_group_id_sequence_key" ON "chat_group_messages"("group_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "chat_group_messages_group_id_sender_id_client_message_id_key" ON "chat_group_messages"("group_id", "sender_id", "client_message_id");

-- CreateIndex
CREATE INDEX "chat_group_media_user_id_group_id_message_id_expires_at_idx" ON "chat_group_media"("user_id", "group_id", "message_id", "expires_at");

-- CreateIndex
CREATE INDEX "chat_group_media_message_id_idx" ON "chat_group_media"("message_id");

-- CreateIndex
CREATE INDEX "chat_group_message_mentions_user_id_created_at_idx" ON "chat_group_message_mentions"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "chat_group_message_mentions_message_id_user_id_key" ON "chat_group_message_mentions"("message_id", "user_id");

-- CreateIndex
CREATE INDEX "chat_group_events_group_id_created_at_idx" ON "chat_group_events"("group_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "chat_group_events_group_id_sequence_key" ON "chat_group_events"("group_id", "sequence");

-- CreateIndex
CREATE INDEX "chat_group_reports_group_id_status_created_at_idx" ON "chat_group_reports"("group_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "chat_group_reports_reporter_id_created_at_idx" ON "chat_group_reports"("reporter_id", "created_at");

-- CreateIndex
CREATE INDEX "chat_group_announcements_group_id_pinned_created_at_idx" ON "chat_group_announcements"("group_id", "pinned", "created_at");
CREATE UNIQUE INDEX "chat_group_announcements_media_id_key" ON "chat_group_announcements"("media_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_group_emojis_shortcode_key" ON "chat_group_emojis"("shortcode");

-- CreateIndex
CREATE INDEX "chat_group_emojis_active_sort_order_idx" ON "chat_group_emojis"("active", "sort_order");

-- CreateIndex
CREATE INDEX "chat_group_audit_logs_group_id_created_at_idx" ON "chat_group_audit_logs"("group_id", "created_at");

-- CreateIndex
CREATE INDEX "chat_group_audit_logs_admin_id_created_at_idx" ON "chat_group_audit_logs"("admin_id", "created_at");

-- CreateIndex
CREATE INDEX "chat_group_rate_limits_window_start_idx" ON "chat_group_rate_limits"("window_start");

-- CreateIndex
CREATE UNIQUE INDEX "chat_group_rate_limits_actor_key_action_window_start_key" ON "chat_group_rate_limits"("actor_key", "action", "window_start");

-- CreateTable
CREATE TABLE "chat_group_reference_stats" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "reference_type" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "click_count" INTEGER NOT NULL DEFAULT 0,
    "last_clicked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "chat_group_reference_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chat_group_reference_stats_group_id_reference_type_reference_id_key" ON "chat_group_reference_stats"("group_id", "reference_type", "reference_id");
CREATE INDEX "chat_group_reference_stats_group_id_click_count_idx" ON "chat_group_reference_stats"("group_id", "click_count");

-- AddForeignKey
ALTER TABLE "chat_groups" ADD CONSTRAINT "chat_groups_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_members" ADD CONSTRAINT "chat_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "chat_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_members" ADD CONSTRAINT "chat_group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_applications" ADD CONSTRAINT "chat_group_applications_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "chat_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_applications" ADD CONSTRAINT "chat_group_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_invites" ADD CONSTRAINT "chat_group_invites_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "chat_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_messages" ADD CONSTRAINT "chat_group_messages_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "chat_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_messages" ADD CONSTRAINT "chat_group_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_messages" ADD CONSTRAINT "chat_group_messages_reply_to_message_id_fkey" FOREIGN KEY ("reply_to_message_id") REFERENCES "chat_group_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_media" ADD CONSTRAINT "chat_group_media_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "chat_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_media" ADD CONSTRAINT "chat_group_media_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_media" ADD CONSTRAINT "chat_group_media_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "chat_group_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_message_mentions" ADD CONSTRAINT "chat_group_message_mentions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "chat_group_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_message_mentions" ADD CONSTRAINT "chat_group_message_mentions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_events" ADD CONSTRAINT "chat_group_events_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "chat_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_events" ADD CONSTRAINT "chat_group_events_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "chat_group_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_reports" ADD CONSTRAINT "chat_group_reports_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "chat_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_reports" ADD CONSTRAINT "chat_group_reports_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "chat_group_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_reports" ADD CONSTRAINT "chat_group_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_announcements" ADD CONSTRAINT "chat_group_announcements_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "chat_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_announcements" ADD CONSTRAINT "chat_group_announcements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "chat_group_announcements" ADD CONSTRAINT "chat_group_announcements_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "chat_group_announcements" ADD CONSTRAINT "chat_group_announcements_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "chat_group_media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_emojis" ADD CONSTRAINT "chat_group_emojis_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_audit_logs" ADD CONSTRAINT "chat_group_audit_logs_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "chat_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_audit_logs" ADD CONSTRAINT "chat_group_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "chat_group_reference_stats" ADD CONSTRAINT "chat_group_reference_stats_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "chat_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Enforce one pending application per user and group, including concurrent requests.
CREATE UNIQUE INDEX "chat_group_applications_one_pending_per_user_group" ON "chat_group_applications" ("group_id", "user_id") WHERE "status" = 'pending';
