CREATE TABLE "vip_adjustment_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "before_status" JSONB,
    "after_status" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vip_adjustment_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "vip_adjustment_logs_user_id_created_at_idx" ON "vip_adjustment_logs"("user_id", "created_at");
CREATE INDEX "vip_adjustment_logs_admin_id_created_at_idx" ON "vip_adjustment_logs"("admin_id", "created_at");

ALTER TABLE "vip_adjustment_logs" ADD CONSTRAINT "vip_adjustment_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vip_adjustment_logs" ADD CONSTRAINT "vip_adjustment_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
