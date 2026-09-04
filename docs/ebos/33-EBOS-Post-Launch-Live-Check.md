# EBOS Post-launch Live Check

## 1. 作用

Post-launch Live Check 是生产部署后的公开页面验收层。它验证线上验证页不仅返回 HTTP 2xx，还必须渲染为完整可用页面，包含标题、CTA、FAQ、合规提示和 metadata。

## 2. 为什么 curl 200 不等于 verified

`curl -I` 只能证明 URL 有响应，不能证明页面内容完整、不是错误页、不是 404 fallback，也不能证明 CTA 和合规提示存在。因此 `deployed_pending_verification` 必须经过正式 live check 后才能进入 `verified`。

## 3. 检查页面内容

当前 v1 检查两个公开页面：

- `https://www.enhe-tech.com.cn/validation/ai-prompt-kit`
- `https://www.enhe-tech.com.cn/en/validation/ai-prompt-kit`

每个页面检查：

- HTTP 2xx
- HTML 非空
- Hero 或标题包含 AI Prompt Kit 或本地化标题
- CTA 存在
- FAQ 存在
- 合规提示或免责声明存在
- `<title>` 和 meta description 存在
- 不是 Next.js error page
- 不是 404 fallback

## 4. verified 条件

只有满足以下条件才允许进入 `verified`：

- 当前 `deploymentStatus=deployed_pending_verification`
- 两个公开 URL 均通过 HTTP 和内容检查
- `overallStatus=passed`
- `canTransitionToVerified=true`
- 写 status 前已生成 `before-verification` backup

禁止从 `executing`、`approved_not_executed`、`failed` 直接进入 `verified`。

## 5. 运行 live check

只生成检查报告，不修改 deployment status：

```bash
npx tsx scripts/run-ebos-post-launch-live-check.ts --date 2026-07-03 --site-url https://www.enhe-tech.com.cn
```

输出：

- `reports/ebos/deployment/post-launch/2026-07-03-post-launch-live-check.json`
- `reports/ebos/deployment/post-launch/2026-07-03-post-launch-live-check.md`

## 6. 运行 verify

先运行 live check，再在满足条件时更新 deployment status：

```bash
npx tsx scripts/verify-ebos-production-deployment.ts --date 2026-07-03 --site-url https://www.enhe-tech.com.cn
```

verify 会生成：

- `reports/ebos/deployment/post-launch/2026-07-03-post-launch-live-check.json`
- `reports/ebos/deployment/post-launch/2026-07-03-post-launch-live-check.md`
- `reports/ebos/deployment/post-launch/2026-07-03-verified-transition.json`
- `reports/ebos/deployment/post-launch/2026-07-03-verified-transition.md`

## 7. 失败后处理

如果 live check 失败：

- 不更新 status 为 `verified`
- 保持 `deployed_pending_verification` 或按后续人工判断进入 `failed`
- 优先修复失败路由、缺失 CTA/FAQ/合规提示、metadata 或错误页问题
- 修复后重新运行 live check 和 verify

## 8. verified 后下一步

进入 `verified` 后，可以进入真实外部渠道发布和数据回填阶段。所有外部渠道、CTA、咨询、订单、收入、退款和反馈数据必须来自真实观测，不能由 EBOS 或 Codex 伪造。
