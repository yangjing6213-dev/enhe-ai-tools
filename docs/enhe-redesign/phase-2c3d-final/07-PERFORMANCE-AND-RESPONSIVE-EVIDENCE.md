# Performance and Responsive Evidence

## Responsive

已执行矩阵覆盖 320、390、480、483、484、767、768、769、1024、1440：

    BROWSER_MATRIX_CASE_COUNT=120
    BROWSER_MATRIX_FAILED=0
    ROOT_HORIZONTAL_OVERFLOW=0
    RESPONSIVE_RESIZE_CLEANUP=PASS
    STALE_OVERLAY_COUNT=0
    STALE_SCROLL_LOCK_COUNT=0
    STALE_TRANSFORM_COUNT=0

483/484 客服 icon/text 边界以及 52px/104px reserve 均通过。该结果不等于 Category panel 的 390px 交叉门禁；后者失败。

## Traced Standalone performance

新增 performance spec 已定义 PerformanceObserver、document.getAnimations、computed style、LayoutShift、生产 marker 和 Prototype marker 检查，但未运行。

原因：SSR 与客服几何已构成生产源码修复需求；失败合同要求立即停止后续成功态 Build/Standalone/视觉取证。

    CATEGORY_CLS_DELTA=NOT_MEASURED
    PRODUCT_STAGE_CLS_DELTA=NOT_MEASURED
    MOBILE_NAV_CLS_DELTA=NOT_MEASURED
    MOTION_LAYOUT_SHIFT_STATUS=NOT_RUN_BLOCKED_UPSTREAM
    ACTIVE_RELEVANT_ANIMATION_COUNT_AFTER_SETTLE=NOT_MEASURED

不得从开发模式矩阵或静态源码推断 CLS 与 standalone animation cleanup 为 PASS。
