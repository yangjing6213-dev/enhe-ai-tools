ALTER TABLE "news_articles"
  ADD COLUMN "source_channel" TEXT,
  ADD COLUMN "imported_at" TIMESTAMP(3),
  ADD COLUMN "import_batch_id" TEXT,
  ADD COLUMN "raw_import_payload" JSONB;

CREATE INDEX "news_articles_source_channel_imported_at_idx"
  ON "news_articles"("source_channel", "imported_at");

CREATE INDEX "news_articles_import_batch_id_idx"
  ON "news_articles"("import_batch_id");
