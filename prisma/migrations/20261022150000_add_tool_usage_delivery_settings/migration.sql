ALTER TABLE "tools"
  ADD COLUMN "delivery_mode" TEXT NOT NULL DEFAULT 'link',
  ADD COLUMN "usage_steps" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN "install_prompt" TEXT;
