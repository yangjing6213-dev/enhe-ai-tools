CREATE TABLE "news_keyword_interventions" (
  "id" TEXT NOT NULL,
  "keyword" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "is_pinned" BOOLEAN NOT NULL DEFAULT false,
  "is_hidden" BOOLEAN NOT NULL DEFAULT false,
  "display_name" TEXT,
  "weight_boost" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "news_keyword_interventions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "news_keyword_interventions_keyword_locale_key"
  ON "news_keyword_interventions"("keyword", "locale");

CREATE INDEX "news_keyword_interventions_locale_is_pinned_is_hidden_idx"
  ON "news_keyword_interventions"("locale", "is_pinned", "is_hidden");
