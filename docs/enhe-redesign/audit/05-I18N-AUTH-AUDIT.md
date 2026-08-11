# 中英文与认证审计

## 国际化

- `src/app/(zh-public)/layout.tsx:4-7` 与 `src/app/en/layout.tsx:4-7` 分别输出 `zh-CN`、`en-US`；`root-layout-shared.tsx:42-48` 有 `<html lang>`。
- `middleware.ts:9-25,32-48` 以 URL 前缀决定 locale 和 Content-Language；对英文路径写入一年期 `enhe_locale` cookie。未发现按 IP/浏览器语言自动重定向逻辑；深层 URL 是否保留用户选择需浏览器实测。
- `src/lib/seo.ts:748-762,202-204` 默认输出 canonical 与 x-default/zh-CN/en-US alternates；动态页面会按英文内容质量决定是否进入 sitemap。
- 公开 HTML 抽样中中英文 canonical 自指；线上 sitemap 中文 259、英文 255，说明存在少量不对称，需解释每个缺失 partner。

## 认证能力

- 现有是邮箱+密码注册/登录：`src/app/actions.ts:45-98`；`src/lib/auth.ts:29-35` bcrypt cost 12。
- 会话存 DB `Session`，签名 cookie、30 天、HttpOnly、SameSite=Lax、生产 Secure：`src/lib/auth.ts:37-57`；过期/撤销和 active user 检查：81-112。
- CSRF 使用 HMAC nonce 且表单校验：`src/lib/csrf.ts:16-35`；登录失败记录和 15 分钟限制：`src/lib/auth.ts:151-175`。
- 管理员通过 `requireAdmin` 服务器端检查：`src/lib/auth.ts:133-149`；后台 layout 也调用：`src/app/admin/layout.tsx:4,41-44`。

## 缺口

- 未找到 Google/GitHub OAuth 配置、provider、账号关联表或 callback route；User 只有 email/phone 唯一，没有外部 identity 模型（`prisma/schema.prisma:206-244`）。
- 未见 magic link、邮箱验证、账号合并/解除关联、冲突邮箱处理或 2FA。管理员登录虽发安全邮件（`src/app/actions.ts:88-96`），不等于 2FA。
- `returnTo` 只在部分 admin 内容操作出现；公共登录重定向固定到用户中心（`src/app/actions.ts:97`），不能满足总方案的安全 returnTo 契约。

## 最小安全改造建议（不接入真实 OAuth）

1. 先定义 `AccountIdentity` 契约：provider、subject、userId、verifiedAt、唯一(provider,subject)；禁止用 email 直接合并。
2. OAuth callback 只允许白名单 redirect URI，state/nonce/PKCE，服务端交换 code；成功后按 provider+subject 绑定，冲突邮箱进入人工确认。
3. 账号合并/解绑写 AdminAuditLog，要求当前会话再认证；保留密码登录作为恢复路径。
4. 增加管理员 2FA/二次确认，不把邮件通知当认证因素。

