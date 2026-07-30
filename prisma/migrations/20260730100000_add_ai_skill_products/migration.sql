ALTER TYPE "ToolType" ADD VALUE 'ai_skill';

ALTER TABLE "tools"
  ADD COLUMN "supported_agents" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
