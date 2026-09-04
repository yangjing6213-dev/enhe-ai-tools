-- AlterEnum
ALTER TYPE "ToolType" ADD VALUE 'skill_learning';

-- AlterTable
ALTER TABLE "tool_price_specs" ALTER COLUMN "updated_at" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "tools_home_recommended_idx" RENAME TO "tools_is_home_recommended_status_sort_order_idx";
