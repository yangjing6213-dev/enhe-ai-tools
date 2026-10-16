CREATE TABLE "forum_bookmarks" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "post_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "forum_bookmarks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "forum_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "forum_bookmarks_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "forum_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "forum_shares" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "post_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "forum_shares_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "forum_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "forum_shares_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "forum_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "forum_bookmarks_user_id_post_id_key" ON "forum_bookmarks"("user_id", "post_id");
CREATE INDEX "forum_bookmarks_post_id_idx" ON "forum_bookmarks"("post_id");
CREATE UNIQUE INDEX "forum_shares_user_id_post_id_key" ON "forum_shares"("user_id", "post_id");
CREATE INDEX "forum_shares_post_id_idx" ON "forum_shares"("post_id");
