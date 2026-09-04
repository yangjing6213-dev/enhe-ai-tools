CREATE TYPE "ProductReleaseStatus" AS ENUM ('planned', 'active', 'released', 'archived');

CREATE TABLE "product_releases" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProductReleaseStatus" NOT NULL DEFAULT 'planned',
    "development_version_id" TEXT,
    "release_date" TIMESTAMP(3),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_releases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_releases_version_key" ON "product_releases"("version");
CREATE INDEX "product_releases_status_sort_order_idx" ON "product_releases"("status", "sort_order");

ALTER TABLE "product_releases"
ADD CONSTRAINT "product_releases_development_version_id_fkey"
FOREIGN KEY ("development_version_id") REFERENCES "development_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
