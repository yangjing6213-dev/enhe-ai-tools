# 动效 Token 只读提案

本文件只定义语义和建议值，不修改 CSS。原则是扩展当前 `--enhe-motion-fast` / `--enhe-motion-panel`，而不是新建第二套系统。

## Duration

| Token 层级 | 建议值 | 使用场景 | 禁止场景 | 对应现有 Token/合同 | 需要新增 | reduced-motion |
| --- | ---: | --- | --- | --- | --- | --- |
| `duration-instant` | `0ms` | 路由、focus、键盘结果、分页、数据阅读 | 不用来隐藏必要状态反馈 | 新语义；无生产 token | YES | `0ms` |
| `duration-press` | `120ms` | 指针/触摸按压反馈 | 路由、panel、营销 reveal | 无 | YES | `0ms` 或纯颜色 instant |
| `duration-fast` | `170ms` | hover、focus-adjacent color、popover | 大面积内容移动 | `--enhe-motion-fast` 已存在 | NO | `0ms`；focus ring 本来即刻 |
| `duration-standard` | `240ms` | 同屏小范围状态 settle、review visual move | 路由、数据网格 | 当前 review 硬编码 240ms | YES | `0ms` 或短 opacity-only |
| `duration-panel` | `200ms` | category layer、drawer、dialog | 逐卡 stagger、H1 | `--enhe-motion-panel` 已存在 | NO | `0ms` 或短 opacity-only |
| `duration-marketing` | `300ms` | 完整产品状态、极少量营销连续性 | 导航、分页、法律文本 | 应映射批准的 `--motion-product: 300ms`；建议生产名 `--enhe-motion-product`，不另建 alias 链 | YES | `0ms` 或短 opacity-only |

评价 `5000ms` interval 与 `6000ms` resume 是行为时序，不与 UI duration 混用；应保持 JS 单一真源并在文档/测试映射，而不是把 CSS custom property 读取成 timer。

## Easing

| Token | 建议值 | 使用场景 | 禁止场景 | 现有映射 | 需要新增 | reduced-motion |
| --- | --- | --- | --- | --- | --- | --- |
| `ease-ui-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | popover、按压释放、轻量进入 | 同屏双向移动、循环 | 当前多处裸 `ease` | YES | N/A when instant |
| `ease-ui-move` | `cubic-bezier(0.4, 0, 0.2, 1)` | 产品/review 同屏位置变化 | drawer 单向进入、路由 | 当前 review 裸 `ease` | YES | N/A when instant |
| `ease-ui-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` | sheet/drawer/dialog 收束 | hover、卡片、文字 | 无 | YES | N/A when instant |

不提议 `ease-in` 作为独立 UI 进入曲线；不提议 bounce/elastic。Spring 只在直接拖拽释放的隔离原型中评估，高阻尼、无过冲。

## Distance

| Token | 建议值 | 使用场景 | 禁止场景 | 现有映射 | 需要新增 | reduced-motion |
| --- | ---: | --- | --- | --- | --- | --- |
| `distance-xs` | `2px` | 细指针按压/hover 的极小位移 | 客服 fixed 位置、文本路由 | support launcher 当前 `-2px` | YES | `0px` |
| `distance-sm` | `8px` | popover、产品内容轻微方向提示 | 全页入场、卡片网格 | 无 | YES | `0px` |
| `distance-md` | `12px` | drawer/sheet 的局部来源提示 | 从屏幕外完整飞入、scroll hijack | 无；旧全页 fade 是 10px 但应删除 | YES | `0px` |

## Stagger

| Token | 建议值 | 使用场景 | 禁止场景 | 现有映射 | 需要新增 | reduced-motion |
| --- | ---: | --- | --- | --- | --- | --- |
| `stagger-fast` | `40ms` | 仅在未来经批准的 2—3 个静态营销子元素 | 产品卡、导航、分页、H1、法律链接 | 无 | DEFER | `0ms` |
| `stagger-standard` | `60ms` | 罕见、低频营销序列且总延迟受限 | 数据列表、rail、客服任务流 | 无 | DEFER | `0ms` |

两个 stagger 仅为词汇占位，当前七个机会均不需要落地；在没有批准使用面之前不应加入 CSS。

## 合并规则

1. 保留 `--enhe-motion-fast` 与 `--enhe-motion-panel` 作为现有生产规范。
2. 只在被选原型证明需要后补 `--enhe-motion-instant`、`--enhe-motion-press`、`--enhe-motion-standard`、`--enhe-motion-product` 与 easing/distance。
3. 不同时保留 `duration-*` 和 `motion-*` 两套 CSS 名；本文的 `duration-*` 是设计层语义，生产仍统一 `--enhe-motion-*`。
4. 不为一次性组件创建局部魔法数字；不为尚无消费者的 stagger 提前编码。
