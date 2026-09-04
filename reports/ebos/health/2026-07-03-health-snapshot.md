# ENHE Website Health Snapshot

Generated At: 2026-07-03T02:33:32.597Z

## 1. 总体健康评分
- Score: 91
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
- [passed] key_product_pages: HEAD https://www.enhe-tech.com.cn/software/windows-ai (Key Product Page Product detail: windows-ai passed with HTTP 200.)
- [passed] key_product_pages: HEAD https://www.enhe-tech.com.cn/software/local-ai-video-studio-for-creator-workflows (Key Product Page Product detail: local-ai-video-studio-for-creator-workflows passed with HTTP 200.)
- [passed] key_product_pages: HEAD https://www.enhe-tech.com.cn/software/zfb-transfer-link-qr-code-generator (Key Product Page Product detail: zfb-transfer-link-qr-code-generator passed with HTTP 200.)
- [passed] key_product_pages: HEAD https://www.enhe-tech.com.cn/software/faceswap-studio-ai (Key Product Page Product detail: faceswap-studio-ai passed with HTTP 200.)
- [passed] key_product_pages: HEAD https://www.enhe-tech.com.cn/software/local-ai-voice-generator-for-voiceover-materials (Key Product Page Product detail: local-ai-voice-generator-for-voiceover-materials passed with HTTP 200.)

### Smoke Checks
- [passed] sitemap: https://www.enhe-tech.com.cn/sitemap.xml HTTP 200
- [passed] robots: https://www.enhe-tech.com.cn/robots.txt HTTP 200
- [passed] homepage: https://www.enhe-tech.com.cn HTTP 307
- [passed] key_product_pages: https://www.enhe-tech.com.cn/software/windows-ai HTTP 200
- [passed] key_product_pages: https://www.enhe-tech.com.cn/software/local-ai-video-studio-for-creator-workflows HTTP 200
- [passed] key_product_pages: https://www.enhe-tech.com.cn/software/zfb-transfer-link-qr-code-generator HTTP 200
- [passed] key_product_pages: https://www.enhe-tech.com.cn/software/faceswap-studio-ai HTTP 200
- [passed] key_product_pages: https://www.enhe-tech.com.cn/software/local-ai-voice-generator-for-voiceover-materials HTTP 200

## 产品页 URL 来源说明
- Source: sitemap
- Environment mismatch risk: no
- Checked URLs:
- [passed] https://www.enhe-tech.com.cn/software/windows-ai (product detail page; source: sitemap; confidence: complete; reason: Discovered in the checked site's sitemap.xml.)
- [passed] https://www.enhe-tech.com.cn/software/local-ai-video-studio-for-creator-workflows (product detail page; source: sitemap; confidence: complete; reason: Discovered in the checked site's sitemap.xml.)
- [passed] https://www.enhe-tech.com.cn/software/zfb-transfer-link-qr-code-generator (product detail page; source: sitemap; confidence: complete; reason: Discovered in the checked site's sitemap.xml.)
- [passed] https://www.enhe-tech.com.cn/software/faceswap-studio-ai (product detail page; source: sitemap; confidence: complete; reason: Discovered in the checked site's sitemap.xml.)
- [passed] https://www.enhe-tech.com.cn/software/local-ai-voice-generator-for-voiceover-materials (product detail page; source: sitemap; confidence: complete; reason: Discovered in the checked site's sitemap.xml.)

## 3. 主要风险
- [info] No failed health checks recorded.

## 4. 修复建议
- [medium] skipped check unit_tests; wire it into the health snapshot when the command is ready.
- [medium] skipped check playwright_smoke; wire it into the health snapshot when the command is ready.
- [medium] skipped check lighthouse; wire it into the health snapshot when the command is ready.

## 5. 后续接入建议
- Add Playwright smoke checks for homepage and key product pages.
- Add Lighthouse/PageSpeed snapshots when Step 3 health checks are stable.
- Feed this health snapshot into the weekly EBOS report before building admin UI.
