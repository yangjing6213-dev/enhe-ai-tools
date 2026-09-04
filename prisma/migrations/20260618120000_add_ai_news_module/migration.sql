-- CreateEnum
CREATE TYPE "NewsStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateTable
CREATE TABLE "news_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'active',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "news_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'active',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "news_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_articles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "keywords" TEXT,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "cover_image" TEXT,
    "video_url" TEXT,
    "video_title" TEXT,
    "video_description" TEXT,
    "author" TEXT,
    "status" "NewsStatus" NOT NULL DEFAULT 'draft',
    "category_id" TEXT,
    "published_at" TIMESTAMP(3),
    "reading_time" INTEGER NOT NULL DEFAULT 5,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "favorite_count" INTEGER NOT NULL DEFAULT 0,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "seo_keywords" TEXT,
    "canonical_url" TEXT,
    "key_takeaways" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "impact_notes" TEXT,
    "conclusion" TEXT,
    "related_article_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "related_tool_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "related_tutorial_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "english_title" TEXT,
    "english_subtitle" TEXT,
    "english_description" TEXT,
    "english_summary" TEXT,
    "english_content" TEXT,
    "english_keywords" TEXT,
    "english_seo_title" TEXT,
    "english_seo_description" TEXT,
    "english_seo_keywords" TEXT,
    "english_key_takeaways" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "english_impact_notes" TEXT,
    "english_conclusion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "news_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_article_tags" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "news_article_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_external_sources" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "news_external_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_article_favorites" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_article_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_article_likes" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_article_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "news_categories_slug_key" ON "news_categories"("slug");

-- CreateIndex
CREATE INDEX "news_categories_status_sort_order_idx" ON "news_categories"("status", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "news_tags_name_key" ON "news_tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "news_tags_slug_key" ON "news_tags"("slug");

-- CreateIndex
CREATE INDEX "news_tags_status_sort_order_idx" ON "news_tags"("status", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "news_articles_slug_key" ON "news_articles"("slug");

-- CreateIndex
CREATE INDEX "news_articles_status_published_at_idx" ON "news_articles"("status", "published_at");

-- CreateIndex
CREATE INDEX "news_articles_category_id_status_idx" ON "news_articles"("category_id", "status");

-- CreateIndex
CREATE INDEX "news_articles_is_featured_is_pinned_sort_order_idx" ON "news_articles"("is_featured", "is_pinned", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "news_article_tags_article_id_tag_id_key" ON "news_article_tags"("article_id", "tag_id");

-- CreateIndex
CREATE INDEX "news_external_sources_article_id_sort_order_idx" ON "news_external_sources"("article_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "news_article_favorites_article_id_user_id_key" ON "news_article_favorites"("article_id", "user_id");

-- CreateIndex
CREATE INDEX "news_article_favorites_user_id_created_at_idx" ON "news_article_favorites"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "news_article_likes_article_id_user_id_key" ON "news_article_likes"("article_id", "user_id");

-- CreateIndex
CREATE INDEX "news_article_likes_user_id_created_at_idx" ON "news_article_likes"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "news_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_article_tags" ADD CONSTRAINT "news_article_tags_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "news_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_article_tags" ADD CONSTRAINT "news_article_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "news_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_external_sources" ADD CONSTRAINT "news_external_sources_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "news_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_article_favorites" ADD CONSTRAINT "news_article_favorites_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "news_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_article_favorites" ADD CONSTRAINT "news_article_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_article_likes" ADD CONSTRAINT "news_article_likes_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "news_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_article_likes" ADD CONSTRAINT "news_article_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
