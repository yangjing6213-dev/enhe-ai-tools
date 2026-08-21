# Accessibility and Reduced Motion

## 已验证子门禁

    POINTER_PROFILE_STATUS=PASS
    KEYBOARD_PROFILE_STATUS=PASS
    REDUCED_MOTION_PROFILE_STATUS=PASS
    ARIA_SELECTED_MISUSE_COUNT=0
    FOCUS_TRAP_STATUS=PASS
    FOCUS_RETURN_STATUS=PASS
    ARIA_LIVE_STATUS=PASS
    ESCAPE_STATUS=PASS
    BODY_SCROLL_LOCK_STATUS=PASS

Category Layer 验证 aria-expanded、aria-controls、named dialog、Tab/Shift+Tab trap、Escape、outside close、focus return 和 scroll lock。

Product Stage 验证 aria-controls、aria-current、live region、无 aria-selected 误用、keyboard 0ms、焦点不丢失及快速切换最终状态。

Mobile Navigation 验证 named modal dialog、当前路由 aria-current、Tab/Shift+Tab trap、Escape、focus return、scroll lock 和 767/768 resize cleanup。

Reduced motion 对三个模块统一为 80ms linear opacity-only，运行时断言拒绝 translate、scale、slide 和 spring。

## 最终限制

语义与 reduced-motion 子门禁通过，但 /software 与 /en/software 的 390px 分类面板覆盖客服完整 hit area。该交互可访问性风险要求生产源码修复，所以整体仍为 BLOCKED。
