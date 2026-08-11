# 下载、文件安全与隐私审计

## 已验证保护

- `src/app/api/tools/[id]/download/route.ts:6-23` 调用 `assertDownloadAccess`，失败返回受控错误，再由 `getSecureFileDownloadUrl` 重定向。
- `src/lib/access.ts:9-61` 服务端检查登录、发布状态、付费购买、下载频率；创建 DownloadLog 并递增下载计数。
- `src/lib/storage.ts:196-203,339-373` 对配置的 COS 文件生成短时签名 URL；过期秒数由环境变量控制。
- 付款凭证图片接口 `src/app/api/payment-proofs/[id]/image/route.ts:7-25` 要求登录并限制为凭证所有者或 admin。
- `src/app/api/uploads/[...fileName]/route.ts:24-57` 拒绝 `..\` 路径穿越并限制扩展名映射。

## P0 条件性风险

- `src/lib/tool-download-link.ts:6-20` 把 `fileUrl`/ `filePath` 当作可展示内容；`src/app/tools/[slug]/page-shell.tsx:290-308,1114-1143` 在详情页渲染下载入口。若 File 指向永久网盘、公共 COS URL 或 `/uploads`，页面/HTML 会泄露真实地址。
- 本地上传路由读取磁盘并返回 `Cache-Control: public, max-age=31536000, immutable`（`src/app/api/uploads/[...fileName]/route.ts:39-49`）。若商品交付包落在该目录，任何知道路径者可长期访问，且 CDN/浏览器会缓存。
- 是否已有线上永久地址无法仅靠公开页面或未登录 checkout 确认；必须对生产 File 清单、HTML/RSC/JSON、CDN 和历史订单做脱敏审计，未完成前按 P0 条件风险处理。

## 目标差距

总方案 1705-1748 要求“登录→权限→短时签名→记录→过期”，并禁止永久地址出现在 HTML、前端状态、JSON-LD、公开 API、sitemap、公共 CDN。当前 COS 分支满足方向，但 local/public fallback 与 free-product public URL 仍不满足统一私有交付边界。

## 建议

1. 先建立公开媒体/私有交付根目录白名单；交付包只允许 object key + 服务端签名，不接受任意 fileUrl。
2. 让下载接口返回短时 URL或流式代理，禁用私有文件公共缓存；迁移历史订单前保留可审计映射。
3. 逐一扫描生产页面源码、RSC、API JSON 和 CDN headers，不打印或传播任何私有 URL；发现一条真实永久地址即阻断上线。

