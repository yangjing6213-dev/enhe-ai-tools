# 风险登记

| ID | Severity | Area | Finding | Evidence | Impact | Recommended action | Target phase | Owner/dependency | Status |
|---|---|---|---|---|---|---|---|---|---|
| R-001 | P0 | 下载/隐私 | File/fileUrl 可能把永久交付地址带入 HTML；本地上传可公共长缓存 | `src/lib/tool-download-link.ts:6-20`; `src/app/tools/[slug]/page-shell.tsx:290-308,1114-1143`; uploads route 39-49 | 他人猜测/传播即可下载，违反上线一票否决 | 生产 File+HTML/RSC/CDN 脱敏盘点；交付包统一短时签名 | Phase 0 收尾/1 | 生产 DB、对象存储、CDN 访问 | conditional blocker |
| R-002 | P1 | 支付 | 付款截图/人工审核链路仍可用 | PaymentProof schema 558-577；上传 route 26-98；总方案 1139-1149 | 新旧状态机并存，用户/后台流程分裂 | 新支付契约；历史凭证只读；停止新上传 | Phase 1/4 | 商户产品与证书 | open |
| R-003 | P1 | 支付 | 正式商户/主动查单/对账/补偿未被生产证据证明 | ZPAY notify GET route 4-12；zpay-orders 143-170,271-347；.env.example 36-42 | 支付成功误判或权限未开通 | 验签字段、回调幂等、查单、重试、对账、异常告警验收 | Phase 4 | 支付商户/运维 | unknown |
| R-004 | P1 | 身份 | 无 Google/GitHub OAuth 和 identity/merge 数据契约 | actions 45-98；schema 206-244；无 OAuth env/route | 无法按总方案发放探索券并安全关联账号 | AccountIdentity+state/nonce/PKCE+冲突处理 | Phase 4 | OAuth 应用凭证 | open |
| R-005 | P1 | 促销 | 无 Coupon/ExplorerPass 模型 | schema 全部枚举/模型；总方案 1205-1257 | ¥5 入场券无法保证唯一领取/锁定/核销 | CouponGrant/Redemption/唯一约束+服务端金额 | Phase 4 | 规则确认 | open |
| R-006 | P1 | SEO/URL | sitemap 含线上 301 旧路径，且代码/生产 URL 漂移 | sitemap 514 条；/online-tools HTTP 301；sitemap.ts 259-355；next.config.ts 49-52 | 重定向/重复/漂移导致抓取和迁移风险 | 逐 URL 状态/自 canonical 对账，过滤 redirect/noindex | Phase 0/6 | 生产部署 SHA | open |
| R-007 | P1 | 公共 IA | help/updates/product-paths 当前 HTTP 404；header 的 Build Your Own X 也 404 | public probes 2026-08-10；site-header.tsx 29-37 | 导航孤岛、总方案页面缺口 | 逐页做 keep/301/404 决策并修复链接 | Phase 1/2 | 内容/设计确认 | open |
| R-008 | P1 | 性能/隐私 | 全站 beforeInteractive 外部脚本 | root-layout-shared.tsx 63-71 | 未同意加载、CWV/合规风险 | 明确用途、同意、延迟加载和预算；必要时移除 | Phase 1 | 合规/增长负责人 | open |
| R-009 | P1 | Git/发布 | 脏工作区、多 worktree、无明确 redesign 隔离点 | git status/worktree list 2026-08-10 | 误覆盖历史变更，无法建立可审计 diff | 新 worktree+归档 tag+基线 SHA；禁止 clean/reset | Phase 0 | 仓库维护者 | open |
| R-010 | P2 | UI | 旧深色渐变/glass/glow 与最终视觉相反 | globals.css 60-104,119-336；总方案 300-328 | 设计返工、性能/可访问性成本 | 设计 token 后分批迁移 | Phase 1 | 高保真稿 | open |
| R-011 | P2 | 英文 | 英文索引由 fallback/质量函数决定，sitemap 仍有 255 条英文 | tool-localization.ts 627-670；线上 sitemap | 薄内容/重复内容进入索引 | 逐页人工抽样、无完整正文则 noindex/补译 | Phase 0/2 | 编辑/翻译 | open |
| R-012 | P2 | 运维 | 根无 CI，备份/恢复/蓝绿/日志保留未知 | .github ABSENT；Dockerfile/deploy.sh；总方案 2018-2076 | 上线无法证明可回滚 | 建立 staging/backup/restore/health gates | Phase 0/8 | 运维权限 | unknown |

