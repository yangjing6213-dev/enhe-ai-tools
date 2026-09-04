# Admin / API / Core Dirty Audit

- riskLevel: `high`
- requiresSeparateAudit: `true`
- requiresUserConfirmation: `true`
- canCommitTogether: `false`

## Counts

|category|count|
|---|---|
|admin|4|
|api|3|
|core|45|

## Representative Files

- src/app/admin/actions.ts
- src/app/admin/license-generator/license-generator-panel.tsx
- src/app/admin/tool-admin-list.tsx
- src/app/admin/tool-media-upload-guard.tsx
- src/app/api/uploads/[fileName]/route.ts
- src/app/api/revalidate/
- src/app/api/uploads/[...fileName]/
- src/lib/admin-i18n.ts
- src/lib/ai-geo-foundations-source.test.ts
- src/lib/ai-trends-source.test.ts
- src/lib/ai-trends.test.ts
- src/lib/ai-trends.ts
- src/lib/analytics.test.ts
- src/lib/analytics.ts
- src/lib/baidu-push-source.test.ts
- src/lib/baidu-push.test.ts
- src/lib/baidu-push.ts
- src/lib/dictionaries.ts
- src/lib/home-ai-news-label.test.ts
- src/lib/i18n.test.ts
- src/lib/license-generator-action-state.ts
- src/lib/license-generator.test.ts
- src/lib/license-generator.ts
- src/lib/media.test.ts
- src/lib/media.ts
- src/lib/public-content.ts
- src/lib/public-slugs.ts
