# ENHE Production Deployment Preflight Report

## 1. 部署前结论
- targetDate: 2026-07-03
- siteUrl: https://www.enhe-tech.com.cn
- readinessScore: 98
- readinessStatus: ready_to_deploy
- 本报告只做只读预检和部署计划，不声称已部署，不打印 secret。

## 2. 本次要上线的内容
- Validation route: /validation/ai-prompt-kit
- Validation route: /en/validation/ai-prompt-kit

## 3. 构建与质量检查
- pass | package.json build script | npm run build
- pass | Production build evidence | npm run build

## 4. 路由检查
- pass | Validation route /validation/ai-prompt-kit | /validation/ai-prompt-kit page file exists.
- pass | Validation route /en/validation/ai-prompt-kit | /en/validation/ai-prompt-kit page file exists.

## 5. 环境变量键名检查
- pass | DATABASE_URL | DATABASE_URL key name is configured or documented.
- pass | Auth secret key | AUTH_SECRET or NEXTAUTH_SECRET key name is configured or documented.
- pass | Site URL key | APP_URL, NEXT_PUBLIC_APP_URL, NEXTAUTH_URL, or EBOS_SITE_URL key name is configured or documented.
- pass | SMTP keys | SMTP_* keys key name is configured or documented.

## 6. Docker / Nginx / 部署配置检查
- Dockerfile: true
- Docker Compose: true
- Nginx config: true
- Deploy docs: true
- pass | Dockerfile detected | Dockerfile exists.
- pass | Docker Compose detected | Docker Compose file exists.
- pass | Nginx config detected | Nginx config exists.
- pass | Deploy docs detected | Deploy docs exist.

## 7. 部署命令计划
- ready | Run lint locally | npm run lint
- ready | Run typecheck locally | npm run typecheck
- ready | Run production build locally | npm run build
- ready | Regenerate validation launch readiness | npx tsx scripts/check-ebos-validation-launch-readiness.ts --date 2026-07-03
- ready | Regenerate validation launch execution | npx tsx scripts/generate-ebos-validation-launch-execution.ts --date 2026-07-03
- ready | Review git status manually | git status
- ready | Review diff stat manually | git diff --stat
- ready | Create a scoped commit only after review | git add <reviewed files> && git commit -m "ebos: add production deployment preflight"
- manual_required | Manual confirmation required | Server project path must be confirmed before SSH or deployment commands are run.
- ready | Build and start production compose stack on server | docker compose -f deploy/enhe-ai-tools/docker-compose.yml up -d --build
- ready | Verify production containers on server | docker compose -f deploy/enhe-ai-tools/docker-compose.yml ps

## 8. 上线后 Smoke Test
- manual_required | http_status https://www.enhe-tech.com.cn/validation/ai-prompt-kit | npx tsx scripts/check-ebos-validation-post-launch.ts --date 2026-07-03 --site-url https://www.enhe-tech.com.cn
- manual_required | page_content https://www.enhe-tech.com.cn/validation/ai-prompt-kit | npx tsx scripts/check-ebos-validation-post-launch.ts --date 2026-07-03 --site-url https://www.enhe-tech.com.cn
- manual_required | cta_present https://www.enhe-tech.com.cn/validation/ai-prompt-kit | npx tsx scripts/check-ebos-validation-post-launch.ts --date 2026-07-03 --site-url https://www.enhe-tech.com.cn
- manual_required | metadata https://www.enhe-tech.com.cn/validation/ai-prompt-kit | npx tsx scripts/check-ebos-validation-post-launch.ts --date 2026-07-03 --site-url https://www.enhe-tech.com.cn
- manual_required | tracking_plan https://www.enhe-tech.com.cn/validation/ai-prompt-kit | npx tsx scripts/check-ebos-validation-post-launch.ts --date 2026-07-03 --site-url https://www.enhe-tech.com.cn
- manual_required | http_status https://www.enhe-tech.com.cn/en/validation/ai-prompt-kit | npx tsx scripts/check-ebos-validation-post-launch.ts --date 2026-07-03 --site-url https://www.enhe-tech.com.cn
- manual_required | page_content https://www.enhe-tech.com.cn/en/validation/ai-prompt-kit | npx tsx scripts/check-ebos-validation-post-launch.ts --date 2026-07-03 --site-url https://www.enhe-tech.com.cn
- manual_required | cta_present https://www.enhe-tech.com.cn/en/validation/ai-prompt-kit | npx tsx scripts/check-ebos-validation-post-launch.ts --date 2026-07-03 --site-url https://www.enhe-tech.com.cn
- manual_required | metadata https://www.enhe-tech.com.cn/en/validation/ai-prompt-kit | npx tsx scripts/check-ebos-validation-post-launch.ts --date 2026-07-03 --site-url https://www.enhe-tech.com.cn
- manual_required | tracking_plan https://www.enhe-tech.com.cn/en/validation/ai-prompt-kit | npx tsx scripts/check-ebos-validation-post-launch.ts --date 2026-07-03 --site-url https://www.enhe-tech.com.cn
- ready | Run public post-launch validation routes check | npx tsx scripts/check-ebos-validation-post-launch.ts --date 2026-07-03 --site-url https://www.enhe-tech.com.cn

## 9. 回滚方案
- Scoped rollback: revert only validation launch surface changes or redeploy the previous reviewed build. Do not reset the whole worktree.
- Review rollback file: src/app/(zh-public)/validation/ai-prompt-kit/page.tsx
- Review rollback file: src/app/en/validation/ai-prompt-kit/page.tsx
- Review rollback file: src/components/validation-ai-prompt-kit-page.tsx
- Review rollback file: src/lib/analytics.ts
- Keep reports/ebos deployment, validation, weekly, and monthly artifacts for 2026-07-03.
- Do not delete reports/ebos during rollback; reports are audit evidence.
- Do not run database reset or destructive Prisma commands for validation-page rollback.

## 10. 风险与阻塞项
- none

## 11. 下一步操作
- Production preflight is ready_to_deploy, but this report does not deploy.
- Ask for explicit user confirmation before SSH or server commands.
- Run post-launch smoke tests only after deployment is confirmed.
