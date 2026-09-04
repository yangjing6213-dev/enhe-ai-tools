-- CreateEnum
CREATE TYPE "GeoPlatformRegion" AS ENUM ('global', 'china');

-- CreateEnum
CREATE TYPE "GeoProviderMode" AS ENUM ('api', 'manual_browser', 'search_console', 'bing_webmaster');

-- CreateEnum
CREATE TYPE "GeoQueryStatus" AS ENUM ('active', 'paused');

-- CreateEnum
CREATE TYPE "GeoRunStatus" AS ENUM ('pending', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "GeoRecommendationStatus" AS ENUM ('open', 'planned', 'done', 'dismissed');

-- CreateTable
CREATE TABLE "geo_queries" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'zh',
    "intent" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "target_path" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "GeoQueryStatus" NOT NULL DEFAULT 'active',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geo_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geo_providers" (
    "id" TEXT NOT NULL,
    "provider_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" "GeoPlatformRegion" NOT NULL,
    "mode" "GeoProviderMode" NOT NULL,
    "official_url" TEXT NOT NULL,
    "description" TEXT,
    "status" "GeoQueryStatus" NOT NULL DEFAULT 'active',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geo_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geo_visibility_runs" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "GeoRunStatus" NOT NULL DEFAULT 'pending',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geo_visibility_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geo_visibility_results" (
    "id" TEXT NOT NULL,
    "run_id" TEXT,
    "query_id" TEXT,
    "provider_id" TEXT,
    "query_text" TEXT NOT NULL,
    "provider_key" TEXT NOT NULL,
    "answer_summary" TEXT,
    "is_brand_mentioned" BOOLEAN NOT NULL DEFAULT false,
    "is_domain_cited" BOOLEAN NOT NULL DEFAULT false,
    "cited_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "competitors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sentiment" TEXT,
    "screenshot_url" TEXT,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geo_visibility_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geo_recommendations" (
    "id" TEXT NOT NULL,
    "query_id" TEXT,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_path" TEXT NOT NULL,
    "status" "GeoRecommendationStatus" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geo_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "geo_queries_query_locale_key" ON "geo_queries"("query", "locale");

-- CreateIndex
CREATE INDEX "geo_queries_status_sort_order_idx" ON "geo_queries"("status", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "geo_providers_provider_key_key" ON "geo_providers"("provider_key");

-- CreateIndex
CREATE INDEX "geo_providers_region_status_sort_order_idx" ON "geo_providers"("region", "status", "sort_order");

-- CreateIndex
CREATE INDEX "geo_visibility_runs_status_started_at_idx" ON "geo_visibility_runs"("status", "started_at");

-- CreateIndex
CREATE INDEX "geo_visibility_results_query_text_provider_key_checked_at_idx" ON "geo_visibility_results"("query_text", "provider_key", "checked_at");

-- CreateIndex
CREATE INDEX "geo_visibility_results_is_brand_mentioned_is_domain_cited_idx" ON "geo_visibility_results"("is_brand_mentioned", "is_domain_cited");

-- CreateIndex
CREATE INDEX "geo_recommendations_status_priority_idx" ON "geo_recommendations"("status", "priority");

-- CreateIndex
CREATE INDEX "geo_recommendations_target_path_idx" ON "geo_recommendations"("target_path");

-- AddForeignKey
ALTER TABLE "geo_visibility_results" ADD CONSTRAINT "geo_visibility_results_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "geo_visibility_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geo_visibility_results" ADD CONSTRAINT "geo_visibility_results_query_id_fkey" FOREIGN KEY ("query_id") REFERENCES "geo_queries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geo_visibility_results" ADD CONSTRAINT "geo_visibility_results_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "geo_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geo_recommendations" ADD CONSTRAINT "geo_recommendations_query_id_fkey" FOREIGN KEY ("query_id") REFERENCES "geo_queries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
