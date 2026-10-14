CREATE TABLE "forum_attachments" (
    "id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "original_name" TEXT NOT NULL,
    "post_id" TEXT,
    "reply_id" TEXT,
    "discarded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "forum_attachments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "forum_attachments_one_parent_check" CHECK ("post_id" IS NULL OR "reply_id" IS NULL),
    CONSTRAINT "forum_attachments_discarded_parent_check" CHECK ("discarded_at" IS NULL OR ("post_id" IS NULL AND "reply_id" IS NULL)),
    CONSTRAINT "forum_attachments_kind_check" CHECK ("kind" IN ('image', 'video')),
    CONSTRAINT "forum_attachments_size_check" CHECK ("file_size" > 0 AND "file_size" <= 104857600)
);
CREATE INDEX "forum_attachments_author_id_created_at_idx" ON "forum_attachments"("author_id", "created_at");
CREATE INDEX "forum_attachments_post_id_idx" ON "forum_attachments"("post_id");
CREATE INDEX "forum_attachments_reply_id_idx" ON "forum_attachments"("reply_id");
ALTER TABLE "forum_attachments" ADD CONSTRAINT "forum_attachments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "forum_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "forum_attachments" ADD CONSTRAINT "forum_attachments_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "forum_replies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
