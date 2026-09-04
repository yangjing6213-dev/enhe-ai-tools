-- CreateEnum
CREATE TYPE "AiTrendBriefingStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateTable
CREATE TABLE "ai_trend_briefings" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "core_conclusion" TEXT NOT NULL,
    "public_highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "full_html" TEXT NOT NULL,
    "source_signals" JSONB,
    "status" "AiTrendBriefingStatus" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMP(3),
    "is_included_in_topic_page" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_trend_briefings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_trend_briefings_date_key" ON "ai_trend_briefings"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ai_trend_briefings_slug_key" ON "ai_trend_briefings"("slug");

-- CreateIndex
CREATE INDEX "ai_trend_briefings_status_published_at_idx" ON "ai_trend_briefings"("status", "published_at");

-- CreateIndex
CREATE INDEX "ai_trend_briefings_is_included_in_topic_page_published_at_idx" ON "ai_trend_briefings"("is_included_in_topic_page", "published_at");
