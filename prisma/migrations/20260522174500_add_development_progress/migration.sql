CREATE TYPE "DevelopmentVersionStatus" AS ENUM ('planned', 'active', 'released', 'archived');
CREATE TYPE "DevelopmentItemStatus" AS ENUM ('completed', 'partial', 'not_started', 'recommended');
CREATE TYPE "DevelopmentPriority" AS ENUM ('high', 'medium', 'low');

CREATE TABLE "development_versions" (
  "id" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "DevelopmentVersionStatus" NOT NULL DEFAULT 'active',
  "started_at" TIMESTAMP(3),
  "released_at" TIMESTAMP(3),
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "development_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "development_items" (
  "id" TEXT NOT NULL,
  "version_id" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "DevelopmentItemStatus" NOT NULL DEFAULT 'not_started',
  "priority" "DevelopmentPriority" NOT NULL DEFAULT 'medium',
  "related_files" TEXT,
  "notes" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "development_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "development_versions_version_key" ON "development_versions"("version");
CREATE INDEX "development_versions_status_sort_order_idx" ON "development_versions"("status", "sort_order");
CREATE UNIQUE INDEX "development_items_version_id_name_key" ON "development_items"("version_id", "name");
CREATE INDEX "development_items_version_id_module_status_idx" ON "development_items"("version_id", "module", "status");

ALTER TABLE "development_items"
  ADD CONSTRAINT "development_items_version_id_fkey"
  FOREIGN KEY ("version_id") REFERENCES "development_versions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
