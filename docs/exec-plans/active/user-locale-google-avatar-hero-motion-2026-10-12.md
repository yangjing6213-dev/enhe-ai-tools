# 用户头像、语言、Google 注册与首页动效

## 验收目标

- 用户中心能读取本地和腾讯云头像；图片失效时显示清楚的默认头像，不显示破图。
- 购物车、站内信浮动按钮和客服入口一致使用白底圆形按钮。
- 注册页提供 Google 注册入口；OAuth 校验 state、nonce、签名、受众及已验证邮箱，并使用 Google `sub` 关联账号。
- 首次访问根据可信国家头判断中英文；自动判断只作用于当前请求，不写入手动语言选择；语言按钮保存用户明确选择，搜索机器人不被重定向。
- 首页标题使用 React Bits 官方 MaskedHeading 组件与现有品牌图片，保留中文双行文案和无障碍标题。

## 范围与限制

- 不读取或输出密钥；Google 登录需服务器环境提供 `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`，并在 Google 控制台登记回调地址。
- Google 身份需要新增唯一 `google_subject` 数据字段及 Prisma 迁移。
- 使用现有 GSAP 依赖，不新增动效依赖；不改变既有页面文案。
- 用户此前已要求将本网站迭代推送并部署；生产迁移与发布前需确认当前工作区、配置和健康检查满足发布流程。

## 验证路径

1. 为头像地址解析、语言自动选择和 Google OAuth 校验先写回归测试，确认测试按预期失败。
2. 实现服务端 OAuth、唯一 Google 身份字段、图片安全地址、浮动按钮样式、语言识别和标题动效；运行目标测试、类型检查、Lint、构建及相关浏览器检查。
3. 审核差异和环境变量是否已设置，再按项目推送部署脚本验证线上回调配置、页面状态和健康检查。

## 状态

- 已从 React Bits 官方 registry 拉取组件 JSON；GSAP 依赖已存在。
- 代码与本地验证：头像地址解析、Google OAuth 校验、自动语言选择、注册入口、浮动按钮样式和首页动效已实现。明确语言网址优先；语言按钮保存用户明确选择；地理位置和浏览器语言推断不再写入手动选择，避免首次访问判断覆盖后续切换。生产资讯页的键盘焦点间距由专用样式覆盖为 3px，基础样式仍为项目 2px 规范；浏览器检查已覆盖两种实际样式。取消的 Next 路由预加载与真实网络失败分开处理。
- 生产头像已只读核验：用户记录保存的是腾讯云 COS 公网格式地址，直接读取返回 403；用服务器现有 COS 配置生成签名后，限量读取返回 206，证实修复路径可以读取原图片。没有输出地址或密钥。
- 生产 Google OAuth：`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`GOOGLE_REDIRECT_URI` 均未配置。Google 注册入口可显示，但尚不能完成线上注册。
- 发布门槛：Docker Desktop 引擎已确认就绪（Docker Server 29.8.2）；`node scripts/test-migration-paths.mjs codex/enhe-recovery-baseline` 已通过，全新安装和从远端基线升级两条迁移路径均无差异；发布 shell 的锁、备份冲突和恢复检查已通过。
- 发布：提交 `0d5d92e9cd56b49c15157e3f4edd8de045a4cae6` 已推送到 `origin/codex/enhe-recovery-baseline`。本轮未部署：生产 Google OAuth 环境变量仍缺失，部署后 Google 注册入口不能完成注册；待在服务器安全配置 `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`GOOGLE_REDIRECT_URI`（回调地址为 `https://www.enhe-tech.com.cn/api/auth/google/callback`）后再部署。
- 本次续测：语言路由等 4 组 Vitest 共 38 项通过；全量 Vitest 为 540 个文件通过、9 个跳过，2765 项通过、97 项跳过；Lint、类型检查和依赖安全审计通过；数据库迁移演练和 Docker 发布脚本检查通过。生产构建退出码为 0，数据库连接使用本机拒绝连接的占位地址，因此构建没有验证数据库驱动的页面内容。生产浏览器定向检查 6/6 通过；完整发布浏览器套件 332 项通过、145 项因数据库或预览环境条件跳过、0 项失败。
