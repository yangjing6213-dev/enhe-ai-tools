CREATE TYPE "ForumCategory" AS ENUM ('question', 'experience', 'workflow', 'showcase');
CREATE TYPE "ForumContentStatus" AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE "ForumReportStatus" AS ENUM ('pending', 'resolved');

CREATE TABLE "forum_posts" (
  "id" TEXT NOT NULL,
  "author_id" TEXT NOT NULL,
  "category" "ForumCategory" NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "status" "ForumContentStatus" NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "forum_posts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "forum_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "forum_replies" (
  "id" TEXT NOT NULL,
  "post_id" TEXT NOT NULL,
  "author_id" TEXT NOT NULL,
  "parent_id" TEXT,
  "content" TEXT NOT NULL,
  "status" "ForumContentStatus" NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "forum_replies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "forum_replies_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "forum_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "forum_replies_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "forum_replies_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "forum_replies"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "forum_likes" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "post_id" TEXT,
  "reply_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "forum_likes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "forum_likes_one_target_check" CHECK (num_nonnulls("post_id", "reply_id") = 1),
  CONSTRAINT "forum_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "forum_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "forum_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "forum_likes_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "forum_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "forum_reports" (
  "id" TEXT NOT NULL,
  "reporter_id" TEXT NOT NULL,
  "post_id" TEXT,
  "reply_id" TEXT,
  "reason" TEXT NOT NULL,
  "status" "ForumReportStatus" NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMP(3),
  CONSTRAINT "forum_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "forum_reports_one_target_check" CHECK (num_nonnulls("post_id", "reply_id") = 1),
  CONSTRAINT "forum_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "forum_reports_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "forum_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "forum_reports_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "forum_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "forum_posts_status_category_created_at_idx" ON "forum_posts"("status", "category", "created_at");
CREATE INDEX "forum_posts_author_id_created_at_idx" ON "forum_posts"("author_id", "created_at");
CREATE INDEX "forum_replies_post_id_status_created_at_idx" ON "forum_replies"("post_id", "status", "created_at");
CREATE INDEX "forum_replies_author_id_created_at_idx" ON "forum_replies"("author_id", "created_at");
CREATE INDEX "forum_replies_parent_id_idx" ON "forum_replies"("parent_id");
CREATE INDEX "forum_likes_user_id_created_at_idx" ON "forum_likes"("user_id", "created_at");
CREATE INDEX "forum_likes_post_id_idx" ON "forum_likes"("post_id");
CREATE INDEX "forum_likes_reply_id_idx" ON "forum_likes"("reply_id");
CREATE INDEX "forum_reports_status_created_at_idx" ON "forum_reports"("status", "created_at");
CREATE INDEX "forum_reports_reporter_id_created_at_idx" ON "forum_reports"("reporter_id", "created_at");
CREATE INDEX "forum_reports_post_id_idx" ON "forum_reports"("post_id");
CREATE INDEX "forum_reports_reply_id_idx" ON "forum_reports"("reply_id");
CREATE UNIQUE INDEX "forum_likes_user_post_unique" ON "forum_likes"("user_id", "post_id") WHERE "post_id" IS NOT NULL;
CREATE UNIQUE INDEX "forum_likes_user_reply_unique" ON "forum_likes"("user_id", "reply_id") WHERE "reply_id" IS NOT NULL;
CREATE UNIQUE INDEX "forum_reports_user_post_unique" ON "forum_reports"("reporter_id", "post_id") WHERE "post_id" IS NOT NULL;
CREATE UNIQUE INDEX "forum_reports_user_reply_unique" ON "forum_reports"("reporter_id", "reply_id") WHERE "reply_id" IS NOT NULL;
