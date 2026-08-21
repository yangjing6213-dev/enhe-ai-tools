# Static Motion Quality Audit

静态验收文件验证了精确提交链、37 路径范围、D4 写入白名单、三个 Variant 参数、Prototype 隔离、路由隔离和客服尺寸/层级合同。

    STATIC_SOURCE_TESTS=7/7 PASS
    MOTION_FOCUSED_TEST_FILES=4/4 PASS
    MOTION_FOCUSED_TESTS=24/24 PASS
    TRANSITION_ALL_COUNT=0
    SCALE_ZERO_COUNT=0
    EASE_IN_ENTRY_COUNT=0
    PERMANENT_WILL_CHANGE_COUNT=0
    LAYOUT_PROPERTY_ANIMATION_COUNT=0
    UNAUTHORIZED_AUTOPLAY_COUNT=0

检查覆盖 duration、easing、keyframes、transform、opacity、reduced motion、keyboard/pointer profile、cleanup 和 cancellation。评价轮播既有 5000ms/6000ms 业务合同未被误算为新增自动动效。

静态质量子门禁 PASS 不覆盖 SSR 内容完整性或运行时几何，因此不能消除最终阻断。
