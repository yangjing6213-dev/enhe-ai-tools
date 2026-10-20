BEGIN;

ALTER TABLE "ai_workflow_topics"
  ADD COLUMN "search_directions" TEXT NOT NULL DEFAULT '';

ALTER TABLE "ai_workflow_batches"
  ADD COLUMN "topic_search_directions_snapshot" TEXT NOT NULL DEFAULT '';

UPDATE "ai_workflow_batches"
SET
  "status" = 'failed',
  "failure_reason" = 'topic_list_changed',
  "completed_at" = NOW(),
  "lease_owner_id" = NULL,
  "lease_token_hash" = NULL,
  "lease_expires_at" = NULL,
  "last_worker_stage" = 'topic_list_changed',
  "updated_at" = NOW()
WHERE "status" IN ('queued', 'paused', 'running');

UPDATE "ai_workflow_topics" SET "is_enabled" = false WHERE "is_enabled" = true;

INSERT INTO "ai_workflow_topics" (
  "id", "slug", "name", "english_name", "search_directions", "sort_order", "is_enabled", "created_at", "updated_at"
) VALUES
  ('aw-topic-bf202e77b5e852aad105', 'topic-bf202e77b5e852aad105', '工作效率', NULL, '搜索趋势 / SaaS 产品发布 / 企业预算', 0, true, NOW(), NOW()),
  ('aw-topic-89174fe72eeec3ae9887', 'topic-89174fe72eeec3ae9887', '视频生成', NULL, '创作者社区 / 模型更新 / 工具榜单', 1, true, NOW(), NOW()),
  ('aw-topic-2169c68eef0df9508489', 'topic-2169c68eef0df9508489', '内容创作', NULL, '社媒讨论 / 模板市场 / 自媒体需求', 2, true, NOW(), NOW()),
  ('aw-topic-d3e0d079ad06e2b9c96e', 'topic-d3e0d079ad06e2b9c96e', '编程开发', NULL, '开发者工具 / GitHub 生态 / IDE 集成', 3, true, NOW(), NOW()),
  ('aw-topic-5536241b31d835046680', 'topic-5536241b31d835046680', '学习教育', NULL, '课程产品 / 家庭学习 / 语言学习', 4, true, NOW(), NOW()),
  ('aw-topic-8010b5ec953d114c7f55', 'topic-8010b5ec953d114c7f55', '搜索研究', NULL, 'AI 搜索 / 知识库 / 研究助手', 5, true, NOW(), NOW()),
  ('aw-topic-3077077adcf743c6b1ef', 'topic-3077077adcf743c6b1ef', '营销销售', NULL, 'CRM / 广告素材 / 客户触达', 6, true, NOW(), NOW()),
  ('aw-topic-c0782df1092e910ad201', 'topic-c0782df1092e910ad201', '办公自动化', NULL, '文档表格 / 会议纪要 / 流程编排', 7, true, NOW(), NOW()),
  ('aw-topic-c6bfde81d300c64b77ea', 'topic-c6bfde81d300c64b77ea', '情感陪伴', NULL, '消费应用 / 社区反馈 / 长时互动', 8, true, NOW(), NOW()),
  ('aw-topic-6802f31247e42e6a468d', 'topic-6802f31247e42e6a468d', '财务法律辅助', NULL, '高风险咨询 / 合同审阅 / 合规工具', 9, true, NOW(), NOW())
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "english_name" = EXCLUDED."english_name",
  "search_directions" = EXCLUDED."search_directions",
  "sort_order" = EXCLUDED."sort_order",
  "is_enabled" = true,
  "updated_at" = NOW();

INSERT INTO "ai_workflow_collection_settings" (
  "id", "is_enabled", "is_paused", "schedule_time", "time_zone", "topic_list_version", "topic_list_confirmed_at", "updated_at"
) VALUES ('default', false, false, '09:00', 'Asia/Shanghai', 1, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "topic_list_version" = "ai_workflow_collection_settings"."topic_list_version" + 1,
  "topic_list_confirmed_at" = NOW(),
  "is_enabled" = false,
  "updated_at" = NOW();

DO $$
DECLARE
  actual_names TEXT[];
BEGIN
  SELECT ARRAY_AGG("name" ORDER BY "sort_order")
  INTO actual_names
  FROM "ai_workflow_topics"
  WHERE "is_enabled" = true;

  IF actual_names <> ARRAY['工作效率', '视频生成', '内容创作', '编程开发', '学习教育', '搜索研究', '营销销售', '办公自动化', '情感陪伴', '财务法律辅助']::TEXT[] THEN
    RAISE EXCEPTION 'AI Workflow topic seed did not match the supplied ordered list.';
  END IF;

  IF (SELECT COUNT(*) FROM "ai_workflow_topics" WHERE "is_enabled" = true AND BTRIM("search_directions") <> '') <> 10 THEN
    RAISE EXCEPTION 'AI Workflow topic search directions are incomplete.';
  END IF;

  IF (SELECT "is_enabled" FROM "ai_workflow_collection_settings" WHERE "id" = 'default') THEN
    RAISE EXCEPTION 'Daily AI Workflow collection must remain disabled after topic initialization.';
  END IF;
END $$;

COMMIT;
