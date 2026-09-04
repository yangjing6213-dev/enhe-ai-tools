-- CreateTable
CREATE TABLE "tool_price_specs" (
    "id" TEXT NOT NULL,
    "tool_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_price_specs_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "tool_price_spec_id" TEXT,
ADD COLUMN "tool_price_spec_name" TEXT;

-- AlterTable
ALTER TABLE "tool_purchases" ADD COLUMN "tool_price_spec_id" TEXT,
ADD COLUMN "tool_price_spec_name" TEXT;

-- CreateIndex
CREATE INDEX "tool_price_specs_tool_id_status_sort_order_idx" ON "tool_price_specs"("tool_id", "status", "sort_order");

-- AddForeignKey
ALTER TABLE "tool_price_specs" ADD CONSTRAINT "tool_price_specs_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tool_price_spec_id_fkey" FOREIGN KEY ("tool_price_spec_id") REFERENCES "tool_price_specs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_purchases" ADD CONSTRAINT "tool_purchases_tool_price_spec_id_fkey" FOREIGN KEY ("tool_price_spec_id") REFERENCES "tool_price_specs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill one default active spec from existing single-price tools.
INSERT INTO "tool_price_specs" ("id", "tool_id", "name", "price", "sort_order", "status", "created_at", "updated_at")
SELECT
    CONCAT('legacy_', "id"),
    "id",
    CASE WHEN "type" = 'online' THEN '默认服务' ELSE '默认授权' END,
    "download_price",
    0,
    'active',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "tools"
WHERE "download_price" > 0;

-- Preserve specification snapshots for historical paid-download orders.
UPDATE "orders"
SET
    "tool_price_spec_id" = CONCAT('legacy_', "tool_id"),
    "tool_price_spec_name" = '默认授权'
WHERE
    "order_type" = 'software_download'
    AND "tool_id" IS NOT NULL
    AND "tool_price_spec_id" IS NULL
    AND EXISTS (
        SELECT 1 FROM "tool_price_specs"
        WHERE "tool_price_specs"."id" = CONCAT('legacy_', "orders"."tool_id")
    );

UPDATE "tool_purchases"
SET
    "tool_price_spec_id" = CONCAT('legacy_', "tool_id"),
    "tool_price_spec_name" = '默认授权'
WHERE
    "tool_id" IS NOT NULL
    AND "tool_price_spec_id" IS NULL
    AND EXISTS (
        SELECT 1 FROM "tool_price_specs"
        WHERE "tool_price_specs"."id" = CONCAT('legacy_', "tool_purchases"."tool_id")
    );
