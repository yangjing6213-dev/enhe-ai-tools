# ENHE Website Health Snapshot

Generated At: 2026-07-02T15:01:52.933Z

## 1. 总体健康评分
- Score: 86
- Grade: excellent
- Confidence: partial

## 2. 命令检查结果
- [passed] lint: npm run lint (Lint passed: npm run lint)
- [passed] typecheck: npm run typecheck (Typecheck passed: npm run typecheck)
- [passed] build: npm run build (Build passed: npm run build)
- [passed] ebos_tests: npm run test -- src/lib/ebos (EBOS Tests passed: npm run test -- src/lib/ebos)
- [skipped] unit_tests: npm test (Unit Tests skipped: npm test)
- [skipped] playwright_smoke: npm run test:e2e (Playwright Smoke skipped: npm run test:e2e)
- [skipped] lighthouse: lighthouse (Lighthouse skipped: lighthouse)
- [passed] sitemap: HEAD https://www.enhe-tech.com.cn/sitemap.xml (Sitemap passed with HTTP 200.)
- [passed] robots: HEAD https://www.enhe-tech.com.cn/robots.txt (Robots passed with HTTP 200.)
- [passed] homepage: HEAD https://www.enhe-tech.com.cn (Homepage passed with HTTP 307.)
- [failed] key_product_pages: HEAD https://www.enhe-tech.com.cn/software/e2e-vip-software-1779325662692-320 (Key Product Page /software/e2e-vip-software-1779325662692-320 failed with HTTP 404.)
- [failed] key_product_pages: HEAD https://www.enhe-tech.com.cn/software/e2e-vip-online-1779325662692-320 (Key Product Page /software/e2e-vip-online-1779325662692-320 failed with HTTP 404.)
- [failed] key_product_pages: HEAD https://www.enhe-tech.com.cn/software/auto-local-tool-1780589814970 (Key Product Page /software/auto-local-tool-1780589814970 failed with HTTP 404.)
- [failed] key_product_pages: HEAD https://www.enhe-tech.com.cn/software/tool-cmptpgzow0007toe0ld9yuc0w (Key Product Page /software/tool-cmptpgzow0007toe0ld9yuc0w failed with HTTP 404.)
- [failed] key_product_pages: HEAD https://www.enhe-tech.com.cn/software/enhe-batch-renamer (Key Product Page /software/enhe-batch-renamer failed with HTTP 404.)

### Smoke Checks
- [passed] sitemap: https://www.enhe-tech.com.cn/sitemap.xml HTTP 200
- [passed] robots: https://www.enhe-tech.com.cn/robots.txt HTTP 200
- [passed] homepage: https://www.enhe-tech.com.cn HTTP 307
- [failed] key_product_pages: https://www.enhe-tech.com.cn/software/e2e-vip-software-1779325662692-320 HTTP 404
- [failed] key_product_pages: https://www.enhe-tech.com.cn/software/e2e-vip-online-1779325662692-320 HTTP 404
- [failed] key_product_pages: https://www.enhe-tech.com.cn/software/auto-local-tool-1780589814970 HTTP 404
- [failed] key_product_pages: https://www.enhe-tech.com.cn/software/tool-cmptpgzow0007toe0ld9yuc0w HTTP 404
- [failed] key_product_pages: https://www.enhe-tech.com.cn/software/enhe-batch-renamer HTTP 404

## 3. 主要风险
- [critical] Revenue path risk: key_product_pages failed: Key Product Page /software/e2e-vip-software-1779325662692-320 failed with HTTP 404.
- [critical] Revenue path risk: key_product_pages failed: Key Product Page /software/e2e-vip-online-1779325662692-320 failed with HTTP 404.
- [critical] Revenue path risk: key_product_pages failed: Key Product Page /software/auto-local-tool-1780589814970 failed with HTTP 404.
- [critical] Revenue path risk: key_product_pages failed: Key Product Page /software/tool-cmptpgzow0007toe0ld9yuc0w failed with HTTP 404.
- [critical] Revenue path risk: key_product_pages failed: Key Product Page /software/enhe-batch-renamer failed with HTTP 404.

## 4. 修复建议
- [high] Fix failed check key_product_pages before treating EBOS health as reliable.
- [high] Fix failed check key_product_pages before treating EBOS health as reliable.
- [high] Fix failed check key_product_pages before treating EBOS health as reliable.
- [high] Fix failed check key_product_pages before treating EBOS health as reliable.
- [high] Fix failed check key_product_pages before treating EBOS health as reliable.
- [medium] skipped check unit_tests; wire it into the health snapshot when the command is ready.
- [medium] skipped check playwright_smoke; wire it into the health snapshot when the command is ready.
- [medium] skipped check lighthouse; wire it into the health snapshot when the command is ready.

## 5. 后续接入建议
- Add Playwright smoke checks for homepage and key product pages.
- Add Lighthouse/PageSpeed snapshots when Step 3 health checks are stable.
- Feed this health snapshot into the weekly EBOS report before building admin UI.
