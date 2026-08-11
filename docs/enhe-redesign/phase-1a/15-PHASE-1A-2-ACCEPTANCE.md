PHASE_1A_2_STATUS=PASS
PHASE_1A_VISUAL_STATUS=PASS
PHASE_1A_USER_APPROVAL=APPROVED
PHASE_1A_FINAL_STATUS=PASS
PHASE_1B_STATUS=NOT_READY

# ENHE Phase 1A.2 验收记录

本文件逐项记录 P1–P5 的合同、实现、浏览器证据、自动验证、截图证据与最终状态。最终证据基线为本地静态服务器 8792、五档视口、195 项浏览器断言、283 项原合同断言和 93 项精修断言。

| 项目 | 合同要求 | 实际实现 | 浏览器证据 | 自动验证 | 截图证据 | 最终状态 |
|---|---|---|---|---|---|---|
| P1 | >=768px 标签只在品牌区域；<768px 只在首页 H1 上方；不可见副本同时 hidden/aria-hidden | `brand-region` + 两个带 `data-brand-label` 的副本；767px media query 与 matchMedia 同步 | 1440/1024/768：header=1、hero=0；390/320：header=0、hero=1；每个视口可见/可访问数=1 | `verify_polish.py` 93/93；浏览器 P1 断言通过 | `zh/en-home-1440.png`、`zh/en-home-390.png` 已打开 | PASS |
| P2 | 首页 5 款、新品 4 款、精选 3 款使用真实本地 ENHE 公共媒体，16:9、固定尺寸、可降级 | 7 张 1672×941 PNG、本地清单、图片尺寸属性、CSS aspect-ratio、JS error fallback；全部产品中已有公开封面也复用本地媒体 | 中英文首页 5/5 `naturalWidth=1672`；软件页每种语言 15 个媒体节点加载；产品切换 src 改变；请求无 TypeShare/私有地址 | 清单 7 项、SHA/来源/文件/flags/本地路径断言；原合同 283/283 | home/software 4 张截图均已打开 | PASS |
| P3 | 手机新品/精选横滑；全部产品单列；无根溢出；支持键盘且不自动滚动 | 两个 `data-horizontal-cards` 容器、scroll-snap、80vw/84vw、即时键盘滚动；all-products 单列 marker | 390：新品 1303>350、精选 1020>350、均有 peek、root=390；列数 390/768/1024/1440=1/2/3/4；两行 ArrowRight 可滚动且空闲不动 | CSS/DOM/JS marker 93/93 | `zh/en-software-390.png` 与桌面软件图已打开 | PASS |
| P4 | zh/en Google/GitHub 按钮有 18–22px 本地图标、完整可访问名、无 OAuth | 两页均使用 20px inline SVG，`aria-hidden=true`，按钮文本保留 | 1440/390 两语言图标均可见、20×20、48px 按钮、居中；focus-visible 外圈清晰 | 图标数量/ARIA/尺寸/无 CDN 断言通过；无 OAuth 请求 | 4 张 signin 截图已打开 | PASS |
| P5 | 英文价值句 exact match；旧句不存在；中文句和 CTA 不变 | 英文首页仅保留最终句 | 浏览器 exact-match 通过，旧句不可见；中文锁定句、CTA 和路由回归通过 | `verify_polish.py` exact/absence/中文回归 + 原合同通过 | `en-home-1440.png`、`en-home-390.png` 已打开 | PASS |

## 回归门禁

- 首页五产品顺序、五条评价、星级、5000ms 轮播、6000ms 恢复、导航、分类、三段软件区块、法律链接与四栏页脚必须由原 `verify_contract.py` 继续验证。
- `R006_STATUS=OPEN`、`R006_PHASE1B_GATE=BLOCKED`。
- `R008_DESIGN_DECISION=REMOVE_FROM_GLOBAL_BEFOREINTERACTIVE`、`R008_IMPLEMENTATION_STATUS=OPEN`、`R008_PHASE1B_GATE=BLOCKED`。
- `R001_PHASE1A_PUBLIC_DESIGN_BOUNDARY=PASS`、`R001_PRODUCTION_FILE_INVENTORY=OPEN`、`R001_PRODUCT_DETAIL_AND_DOWNLOAD=BLOCKED`。
- 本地公开媒体只证明设计原型使用了 ENHE 公开资产，不证明生产文件清单或下载边界已完成。

## Browser evidence summary

`BROWSER_TOTAL=195`  
`BROWSER_PASSED=195`  
`BROWSER_FAILED=0`  
`REQUEST_UNIQUE_COUNT=21`  
`TYPEShare_REQUESTS=0`  
`PRIVATE_DELIVERY_REQUESTS=0`  
`CONSOLE_ERRORS=0`

Mobile software document heights changed from the Phase 1A.1 evidence of zh `9177px` / en `9849px` to zh `7405px` / en `7877px` after horizontal rows and real media were applied. Height is recorded as evidence, not a fixed acceptance threshold.

## Screenshot evidence (final)

| filename | width | height | fileSize | sha256 |
|---|---:|---:|---:|---|
| zh-home-1440.png | 1440 | 2615 | 351185 | EAE9917D471F68EF67F6DE427EC1DE78A47C4379F1377D1EDA9C8CE3B606E060 |
| zh-home-390.png | 390 | 3145 | 168308 | 6F3EF3373C60E66A6A689F7CAFC7F9BDFE88F930214727B9063C4C8B637C0DAA |
| zh-software-1440.png | 1440 | 3223 | 896591 | 88F93293CD0FE641FA332233DAEFB3CBB3730F2C7126705F59E037AF2EF8C2DC |
| zh-software-390.png | 390 | 7405 | 798827 | 5D8FADF6D71922013AC0E684294F3FF2A21EEB4116DEA3EFF14F7988BF18476B |
| zh-signin-1440.png | 1440 | 900 | 28278 | 8E7F3E177E06C0EAC0448965ABC2B38F95AE24CA094723D87FDCA3E664BE50D5 |
| zh-signin-390.png | 390 | 844 | 22402 | DCAD7F3AAD56D9F258D74FDB525B437C4A7F1FB52902B77056C5D7AC6A790452 |
| en-home-1440.png | 1440 | 2644 | 348878 | 4E9DD8C50AB7FF9FB45F59CDB090D18114F4DD1861A9C2CB844B2963F6B997C3 |
| en-home-390.png | 390 | 3282 | 166812 | DF52ACD539A0C5CB5FDCF6A0AD4F71FEFD8982F4AC94FFFD453B9DB35E8DA729 |
| en-software-1440.png | 1440 | 3346 | 851402 | A964046D8CA4AD15E3F9DFE5F1E4B19B343FC0B014934E468FC0DD48A528CFD4 |
| en-software-390.png | 390 | 7877 | 751312 | 0D659E03F11F052C2CB26424D17E6E10450EDBF8E363375DB1FA479A60D4C582 |
| en-signin-1440.png | 1440 | 900 | 26326 | AED734BABC37C207B2551D33A7DDFDFFFFAF2BC0F7F9AB311F70C24B0B63F148 |
| en-signin-390.png | 390 | 844 | 20920 | E2583BBCB8288A6FD8D8ED694CEB8781F4323537F34EE74C78E5D82D3753FDF9 |

## Final gate snapshot

`PHASE_1A_2_STATUS=PASS`  
`PHASE_1A_VISUAL_STATUS=PASS`  
`PHASE_1A_USER_APPROVAL=APPROVED`  
`PHASE_1A_FINAL_STATUS=PASS`  
`PHASE_1B_STATUS=NOT_READY`
