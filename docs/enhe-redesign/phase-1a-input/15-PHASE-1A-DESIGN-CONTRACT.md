# ENHE Phase 1A：设计系统、第一批高保真页面与公共壳契约

## 1. 状态与文档权威

```text
PHASE_0_5_STATUS=PASS
PHASE_1A_STATUS=READY
PHASE_1B_STATUS=NOT_READY
```

本文件只定义 Phase 1A 的设计与契约工作。不得把设计原型误称为生产代码或已上线页面。

文档权威顺序：

1. `docs/enhe-redesign/00-MASTER-SPEC.md`
2. `docs/enhe-redesign/14-PAYMENT-AND-PHASE0-DECISION-ADDENDUM.md`
3. `docs/enhe-redesign/phase-0.5/09-PHASE-0.5-REVIEW-CORRECTIONS.md`
4. 本文件
5. 其余 Phase 0.5 与 Phase 0 原始审计文件

发生冲突时采用更高优先级文件。

---

## 2. Phase 1A 的唯一目标

产出可由用户真实查看、点击和逐页验收的第一批高保真设计，同时冻结：

- 全局设计 token；
- 页头、页脚和公共壳信息架构；
- 首页；
- 首页五产品演示区；
- 首页用户评价区；
- AI工具产品列表页；
- 登录/注册页；
- 中文与英文版本；
- 1440px 与 390px 高保真界面；
- 1024px、768px、320px 响应式规则；
- 动效、键盘、焦点、加载、空状态和错误状态；
- SEO/GEO 语义契约；
- Phase 1B 代码实施前门禁。

Phase 1A 只允许创建设计文档、静态设计原型、设计用原创 SVG/占位素材和截图。不得修改生产应用代码。

---

## 3. 视觉参考边界

### 3.1 唯一主参考

- 首页：`https://typeshare.co/`
- 产品列表：`https://typeshare.co/templates`
- 登录：`https://typeshare.co/auth/signin`

随本契约提供固定截图：

```text
reference/01-typeshare-homepage-reference.png
reference/02-typeshare-templates-reference.png
reference/03-typeshare-signin-reference.png
```

页脚还提供：

```text
reference/04-current-enhe-footer-antireference.png
reference/05-flat-footer-layout-reference.png
```

### 3.2 高保真参考的内容

允许高度参考：

- 页面节奏；
- 内容宽度；
- 大字号与强留白；
- 暖白、近黑、鼠尾草绿、浅灰绿和黄色；
- 标题/副标题比例；
- 按钮尺寸、圆角和反馈；
- 演示区域比例；
- 卡片密度；
- 分类下拉菜单；
- 登录表单布局；
- 响应式和动效逻辑。

### 3.3 严禁复制

不得复制 TypeShare 的：

- 源代码；
- CSS；
- 图片；
- 用户头像；
- 评价；
- 品牌名称；
- Logo；
- 字体文件；
- 文案；
- 产品数据；
- 付费或受保护资产。

所有代码和视觉资产必须由 ENHE 独立制作。可使用仓库中现有的 ENHE 自有 Logo、产品截图和公开媒体，但必须记录来源路径。

---

## 4. 设计语言

### 4.1 颜色意图

Phase 1A 应从参考截图采样并最终确定精确 token，但必须保持以下方向：

```text
页面背景：暖白
主要文字：近黑
次要文字：中性灰
主要按钮：鼠尾草绿色
演示背景：浅灰绿色
强调标签/星级：黄色
边框：极浅灰绿
页脚：深墨绿色
```

禁止：

- 蓝紫渐变；
- 霓虹；
- 发光描边；
- 大面积玻璃拟态；
- 粒子背景；
- glitch；
- 持续呼吸动画；
- 大阴影；
- 渐变文字。

### 4.2 字体

中文：

```text
Microsoft YaHei
PingFang SC
Noto Sans SC
system-ui
```

英文：

```text
Inter
Arial
system-ui
```

不把字体文件复制进项目。使用系统或项目已合法配置的字体回退。

### 4.3 初始字号目标

```text
首页 H1：64–72px desktop / 42–48px mobile
内页 H1：52–60px desktop / 36–42px mobile
区块标题：38–44px desktop / 30–34px mobile
副标题：20–22px desktop / 17–19px mobile
正文：16–18px desktop / 16px mobile
导航：14–15px desktop / 16px mobile
```

Phase 1A 需要根据真实中文换行效果微调并记录最终 token。

---

## 5. 全局页头

### 5.1 桌面结构

左侧：

- ENHE Logo；
- 黄色品牌标签：`给人生加一个 AI 外挂`。

右侧顺序：

1. AI工具
2. AI Skill
3. AI资讯
4. AI趋势
5. 关于我们
6. 搜索图标
7. 中文 / EN
8. 登录或用户头像

管理员入口只在管理员头像菜单中出现，普通访客和普通用户不可见。

### 5.2 行为

- 首页页头默认不吸顶；
- 业务内页轻量吸顶；
- 不使用厚重阴影和毛玻璃；
- 当前栏目使用字体加重和细短线；
- 搜索打开轻量弹层；
- 语言切换指向当前页面对应语言。

### 5.3 移动端

```text
ENHE Logo      中文 / EN      菜单
```

菜单从右侧进入，暖白背景，禁止背景滚动，不设置大型二级菜单。

---

## 6. 首页高保真契约

### 6.1 页面结构

```text
01 页头
02 黄色品牌标签
03 H1
04 副标题
05 主按钮
06 五产品手动演示区
07 自动滑动评价区
08 最终价值陈述
09 主按钮
10 极简页脚
```

首页不得加入产品分类墙、资讯列表、趋势列表、Skill 卡片墙、关键词墙或复杂说明。

### 6.2 锁定文案

黄色标签：

```text
给人生加一个 AI 外挂
```

H1：

```text
一站式AI平台
```

副标题：

```text
发现真正好用的 AI 工具、智能体与实战方法，让工作更快、创作更自由，把每个灵感变成看得见的成果。
```

主按钮：

```text
开始探索AI
```

主按钮目标：

```text
中文：/software
英文：/en/software
```

最终价值文案：

```text
让每一个普通人，都能借助 AI，创造过去做不到的事。
```

### 6.3 五产品演示

顺序固定：

1. 无所不能版｜AI生成视频应用
2. InfiniteTalk
3. AI语音生成
4. Lumi-OS
5. FaceSwap Studio

功能说明：

```text
无所不能版｜AI生成视频应用
本地完成文生视频、图生视频与视频增强，不受在线平台限制，打造更自由、更接近“无所不能”的视频创作体验。

InfiniteTalk
使用人物图片与音频，生成自然流畅的数字人口播视频。

AI语音生成
本地生成旁白、配音和多角色对话，不受在线次数与平台流程限制，打造更自由、更接近“无所不能”的声音创作体验。

Lumi-OS
AI智能体不仅能够作为你的情感陪伴，还能协助整理任务、记忆信息和完成日常工作。

FaceSwap Studio
本地完成人物素材合成、效果预览与创作处理，不受在线平台限制，打造更自由、更接近“无所不能”的人像创作体验。
```

交互：

- 产品绝不自动轮播；
- 窗口左右按钮手动切换；
- 移动端支持滑动，但仍保留明确按钮；
- 显示 `01 / 05`；
- 切换时暂停当前视频；
- 下一项保持封面，不自动播放；
- Prototype 未取得真实视频时使用明确的真实产品截图或设计占位框，不伪造产品功能；
- 五个产品名称和详情链接在语义结构中全部存在。

### 6.4 评价

设计原型标题：

```text
产品体验示例
```

原型使用 5 条样例数据，不得标记为“已验证购买”：

| 产品 | 昵称 | 星级 |
|---|---|---:|
| 无所不能版｜AI生成视频应用 | 林小满 | 5 |
| InfiniteTalk | 周一然 | 4 |
| AI语音生成 | 陈知夏 | 5 |
| Lumi-OS | Mia Carter | 5 |
| FaceSwap Studio | Ethan Brooks | 4 |

使用原创系统插画/SVG 默认头像，不模仿现实人物。

轮播：

- 每 5 秒自动滑动一条；
- 两侧淡出；
- hover、focus、drag 时暂停；
- 手动操作后约 6 秒恢复；
- `prefers-reduced-motion` 时停止自动轮播；
- 可使用键盘和触摸操作。

---

## 7. AI工具产品列表页

路由目标：

```text
/software
/en/software
```

### 7.1 结构

```text
页头
顶部居中分类选择器
新品推荐
精选产品
全部产品
加载更多 / 可抓取分页契约
页脚
```

不得增加左侧栏。

### 7.2 分类下拉

顺序固定：

1. 全部产品
2. AI Skill
3. 视频生成
4. 图片处理
5. 语音音频
6. AI智能体
7. 效率工具

桌面使用深色浮层，移动端使用底部面板。

### 7.3 卡片与分页

- 新品推荐：最多 4 张；
- 精选产品：3 张横向卡片；
- 全部产品：桌面 4 列；
- 默认每页 12 款；
- 使用“加载更多”视觉；
- 语义契约必须保留可抓取分页；
- 卡片仅展示封面、类型、名称、功能说明、价格/免费和最多一个标签；
- 整张卡片可点击；
- 不显示中英文双标题、大量关键词和重复按钮。

响应列数：

```text
1440：4
1024：3
768：2
390/320：1
```

---

## 8. 登录与注册

参考 `reference/03-typeshare-signin-reference.png`。

### 8.1 中文文案

```text
欢迎来到 ENHE AI
一站式AI平台

使用 Google 继续
使用 GitHub 继续
或
电子邮箱
继续
```

底部显示用户协议和隐私政策链接。

### 8.2 英文文案

```text
Welcome to ENHE AI.
The All-in-One AI Platform.

Continue with Google
Continue with GitHub
or
Email address
Continue
```

### 8.3 设计边界

- 左上角 ENHE Logo；
- 大面积暖白留白；
- 表单宽度约 400–440px；
- 不使用大卡片背景、蓝紫渐变或光效；
- Phase 1A 只设计 OAuth 按钮和状态，不接入 OAuth；
- 需要展示默认、hover、focus、loading、disabled、error 状态；
- 移动端键盘出现时主操作仍可见。

---

## 9. 页脚

方向：

- 深墨绿色；
- 平铺四栏；
- 不使用现有三张带边框大卡片；
- 不重复 AI工具、AI Skill、AI资讯、AI趋势；
- 不在页脚放语言切换；
- 详细地址与电话移至关于我们页面。

栏目：

```text
ENHE AI
帮助与服务
合规条款
公司信息
```

帮助与服务：

```text
帮助支持
使用教程
购买与下载
产品更新
```

合规条款：

```text
用户协议
隐私政策
退款规则
版权投诉
未成年人保护
```

公司信息：

```text
公司名称
品牌档案
联系邮箱
```

移动端改为纵向排列或轻量折叠，不使用大边框卡片。

---

## 10. 动效

目标：

```text
hover：160–180ms
button press：120–160ms
dialog/dropdown：180–220ms
card switch：240–300ms
product carousel：280–320ms
page content：240–360ms
```

只优先使用 `opacity` 和 `transform`。

禁止复杂全站转场、视差、粒子和持续运动背景。

---

## 11. 响应式与可访问性

设计基准：

```text
1440
1024
768
390
320
```

必须满足：

- 触控区域至少 44×44px；
- 键盘可访问；
- `focus-visible` 清晰；
- 不只用颜色表达状态；
- 表单有真实 label；
- 图片替代文字契约；
- 视频字幕契约；
- 自动评价可暂停；
- 200% 缩放核心功能仍可用；
- WCAG 2.2 AA 为目标；
- `prefers-reduced-motion` 降级。

---

## 12. SEO/GEO 语义契约

Phase 1A 不修改生产 SEO，但设计必须预留：

- 每页唯一 H1；
- 重要标题和功能说明必须是真实文字，不嵌在图片中；
- 页头与卡片使用真实链接语义；
- 首页五产品名称与详情链接全部存在于语义结构；
- `/software` 的分页契约可抓取；
- 中文页只显示中文，英文页只显示英文；
- 设计不展示关键词墙、“可摘录答案”或“GEO内容”；
- 轮播、下拉、弹层不阻断核心内容发现；
- 图片和视频预留固定尺寸，避免 CLS；
- 不把搜索参数页设计成主要落地页；
- 搜索和登录保持 `noindex` 契约；
- 任何公开组件都不得读取或展示 `fileUrl`、`filePath`、永久下载地址或私有对象 key。

---

## 13. Phase 1B 门禁设计输出

Phase 1A 必须产生三个独立决策/证明文档：

### R-006

输出 URL/sitemap/canonical 基线冻结计划，说明需要哪些生产数据、如何比较和何时形成冻结快照。

### R-008

审查全局 ByteDance 外部脚本：

- 用途；
- 加载时机；
- 是否必要；
- 合规/同意；
- Core Web Vitals；
- 推荐方案。

默认推荐原则：若无法证明对核心业务必要，不允许继续 `beforeInteractive` 全站加载。

### R-001

输出公共壳与产品组件的文件隔离证明计划：

- Prototype 仅使用公开媒体；
- 不使用 File.fileUrl/filePath；
- 不呈现交付地址；
- 后续产品详情和下载实现仍受 R-001 硬门禁。

---

## 14. Phase 1A 非目标

不得：

- 修改 `src/**`；
- 修改 `prisma/**`；
- 修改 `package.json` 或 lockfile；
- 修改 Next/Tailwind 配置；
- 修改路由；
- 实现 OAuth；
- 实现支付；
- 实现优惠券；
- 实现数据库模型；
- 修改下载 API；
- 删除旧页面；
- 部署；
- push；
- 复制 TypeShare 源代码或资产。

---

## 15. 交付物

Codex 应在以下目录创建结果：

```text
docs/enhe-redesign/phase-1a/
├── 00-PHASE-1A-MANIFEST.md
├── 01-DESIGN-TOKENS.md
├── 02-GLOBAL-SHELL-CONTRACT.md
├── 03-HOMEPAGE-HIFI-SPEC.md
├── 04-SOFTWARE-LIST-HIFI-SPEC.md
├── 05-AUTH-HIFI-SPEC.md
├── 06-RESPONSIVE-A11Y-MOTION.md
├── 07-SEO-GEO-SEMANTIC-CONTRACT.md
├── 08-R006-URL-BASELINE-FREEZE-PLAN.md
├── 09-R008-EXTERNAL-SCRIPT-DECISION.md
├── 10-R001-PUBLIC-PRIVATE-FILE-BOUNDARY.md
├── 11-FIRST-BATCH-ACCEPTANCE-RESULT.md
├── 12-COMMAND-LOG.md
├── prototype/
│   ├── zh/
│   │   ├── home.html
│   │   ├── software.html
│   │   └── signin.html
│   ├── en/
│   │   ├── home.html
│   │   ├── software.html
│   │   └── signin.html
│   ├── assets/
│   ├── styles.css
│   └── prototype.js
└── screenshots/
    ├── zh-home-1440.png
    ├── zh-home-390.png
    ├── zh-software-1440.png
    ├── zh-software-390.png
    ├── zh-signin-1440.png
    ├── zh-signin-390.png
    ├── en-home-1440.png
    ├── en-home-390.png
    ├── en-software-1440.png
    ├── en-software-390.png
    ├── en-signin-1440.png
    └── en-signin-390.png
```

所有 HTML/CSS/JS 只属于静态设计原型，不进入生产 bundle。

---

## 16. Phase 1A 验收状态

完成后只能输出以下之一：

```text
PHASE_1A_STATUS=PASS
```

或：

```text
PHASE_1A_STATUS=BLOCKED
```

`PASS` 表示设计与契约交付完整，不表示 Phase 1B、全站开发或上线就绪。
