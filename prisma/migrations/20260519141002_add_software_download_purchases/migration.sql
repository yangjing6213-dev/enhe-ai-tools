-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('vip', 'software_download');

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_plan_id_fkey";

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "order_type" "OrderType" NOT NULL DEFAULT 'vip',
ADD COLUMN     "tool_id" TEXT,
ALTER COLUMN "plan_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tools" ADD COLUMN     "download_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "is_download_paid" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "tool_purchases" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tool_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tool_purchases_order_id_key" ON "tool_purchases"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "tool_purchases_user_id_tool_id_key" ON "tool_purchases"("user_id", "tool_id");

-- CreateIndex
CREATE INDEX "orders_tool_id_order_status_idx" ON "orders"("tool_id", "order_status");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "vip_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_purchases" ADD CONSTRAINT "tool_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_purchases" ADD CONSTRAINT "tool_purchases_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_purchases" ADD CONSTRAINT "tool_purchases_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
