CREATE TABLE "tool_likes" (
    "id" TEXT NOT NULL,
    "tool_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tool_likes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tool_likes_tool_id_user_id_key" ON "tool_likes"("tool_id", "user_id");
CREATE INDEX "tool_likes_user_id_created_at_idx" ON "tool_likes"("user_id", "created_at");
ALTER TABLE "tool_likes" ADD CONSTRAINT "tool_likes_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tool_likes" ADD CONSTRAINT "tool_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
