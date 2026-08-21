# Cross-module Interaction Matrix

| 场景 | 实际结果 | 备注 |
| --- | --- | --- |
| 4 routes × 10 widths × 3 modalities | 120/120 PASS | pointer、keyboard、reduced motion |
| 首页 Product + Mobile Nav + language | 1/1 PASS | 无闪回、无排队动画、无残留 body lock |
| 软件 Category + Mobile Nav，中文 | FAIL | 390×844 keyboard；面板与客服交叉 1936 px² |
| 软件 Category + Mobile Nav，英文 | FAIL | 390×844 keyboard；面板与客服交叉 1936 px² |
| 客服 483/484 正式控件排除区 | 2/2 PASS | 52px/104px reserve 与 44px 边界正确 |
| Category stress | 30/30 PASS | 无固定长 sleep |
| Product stress | 30/30 PASS | 最终产品 ID 可确定 |
| Mobile Nav stress | 30/30 PASS | 含 enter 中 Escape/resize |
| Cross-module stress | 20/20 PASS | 最终状态可确定 |

软件组合场景在几何断言前已验证：

- 有效 modal 最大值为 1。
- 两个弹层各自的 Tab/Shift+Tab focus-trap 行为通过；未实现独立的 focus-trap owner/listener 计数器。
- 分类打开时 overlay 阻止移动菜单成为第二个活动 modal。
- route navigation 后 body scroll lock 已清理。
- nav 与 category 的 focus return 均通过。

最终失败 DOM 状态：

    ROUTES=/software,/en/software
    VIEWPORT=390x844
    MODALITY=keyboard
    CATEGORY_PANEL_VISIBLE=YES
    SUPPORT_SIZE=44x44
    CATEGORY_PANEL_SUPPORT_INTERSECTION_PX2=1936
    ACTIVE_MODAL_DIALOG_MAX_COUNT=1
    ACTIVE_FOCUS_TRAP_MAX_COUNT=NOT_MEASURED
    FOCUS_TRAP_BEHAVIOR_STATUS=PASS
    CROSS_MODULE_INTERACTION_STATUS=BLOCKED

当前 133 个 acceptance case 的分段结果可调和为 129 PASS、4 FAIL，但最终断言加入后未再执行一次完整聚合；因此该数值仅为已执行分段证据的推导，不冒充单次完整测试输出。
