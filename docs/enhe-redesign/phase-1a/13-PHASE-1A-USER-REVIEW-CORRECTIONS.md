PHASE_1A_REVIEW_STATUS=REWORK_REQUIRED
PHASE_1A_STATUS=BLOCKED
PHASE_1B_STATUS=NOT_READY

# User review corrections C1–C12

| ID | 问题 | 根因 | 修正位置 | 验证方法 | 最终状态 |
|---|---|---|---|---|---|
| C1 | 首页锁定文案被擅自替换 | 原型使用了未批准的自定义口号 | `zh/home.html`, `en/home.html`, homepage spec | exact string assertions + browser | CLOSED |
| C2 | 页头导航顺序和栏目错误 | 用了简化的信息架构 | all six headers, shell contract | ordered text-index assertion | CLOSED |
| C3 | 首页未按参考结构高保真 | 使用了分栏首屏 | home markup and CSS | DOM order + 1440 screenshot | CLOSED |
| C4 | 五款真实产品被未确认方向替换 | 产品数据未从公开 ENHE 来源核对 | home carousel and product manifest | exact names/order assertion | CLOSED |
| C5 | 评价数量、头像、星级、速度、淡出不符 | 只有单条黑色引言和占位说明 | testimonial markup, five avatar SVGs, JS | five-record/4–5 star/timing/visual checks | CLOSED |
| C6 | AI 工具页分类、区块、产品结构错误 | 使用了临时分类和单一网格 | software markup, layer JS, CSS | seven-category/three-section/grid checks | CLOSED |
| C7 | 登录文案和条款入口错误 | 默认显示了旧欢迎词和调试状态 | sign-in pages | exact default-content assertion + screenshot | CLOSED |
| C8 | 页脚栏目错误且含内部说明 | 复用了上一版原型 footer | all six footers | exact footer heading/forbidden text check | CLOSED |
| C9 | 1024/768 列数错误 | 断点只覆盖了两档 | stylesheet | computed grid-template-columns at both widths | CLOSED |
| C10 | 命名截图实际宽度错误 | 浏览器滚动条占用布局宽度 | scrollbar treatment + new captures | Python PNG width reader | CLOSED |
| C11 | reduced-motion 未停止 JS 轮播 | 只写了 CSS media query | `prototype.js` matchMedia gate | browser emulation + verifier | CLOSED |
| C12 | 原验收只检查文件存在 | 缺少内容、交互和像素证据 | verifier, acceptance result, command log | complete PASS/FAIL output | CLOSED |

All twelve corrections are closed only after the final verifier and visual review pass. Production remains gated.

## Phase 1A.2 relation

The approved P1–P5 polish is additive to these closed corrections: it changes only label placement, public product media, mobile new/featured presentation, provider icons, and the final English value sentence. C1–C12 locked structure, product/review order, timers, navigation, category order, legal links, footer and Phase 1B gates remain under `verify_contract.py` regression coverage.
