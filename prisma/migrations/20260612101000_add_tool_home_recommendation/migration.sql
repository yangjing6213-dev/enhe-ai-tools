ALTER TABLE "tools" ADD COLUMN "is_home_recommended" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "tools_home_recommended_idx" ON "tools"("is_home_recommended", "status", "sort_order");
