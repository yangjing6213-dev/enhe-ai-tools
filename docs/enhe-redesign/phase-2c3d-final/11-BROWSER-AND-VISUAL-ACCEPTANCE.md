# Browser and Visual Acceptance

Playwright Chromium 开发路由覆盖：

- /、/en、/software、/en/software。
- 10 个合同宽度。
- pointer、keyboard、reduced-motion。
- console error 与 page error 监控。

    BROWSER_MATRIX_CASE_COUNT=120
    BROWSER_MATRIX_FAILED=0
    CONSOLE_ERROR_COUNT=0
    PAGE_ERROR_COUNT=0
    ROOT_HORIZONTAL_OVERFLOW=0

最终浏览器验收仍为 BLOCKED：

- /、/en：390×844、JavaScript disabled，四个产品 ID 不在 SSR HTML。
- /software、/en/software：390×844、keyboard，分类面板与客服交叉 1936 px²。

成功态视觉证据未生成：

    SCREENSHOT_COUNT=0
    REQUIRED_SCREENSHOT_COUNT=12
    VIDEO_COUNT=0
    REQUIRED_VIDEO_COUNT=4
    VIDEO_BAD_FILE_COUNT=NOT_MEASURED
    VIDEO_DUPLICATE_HASH_COUNT=NOT_MEASURED
    VISUAL_ACCEPTANCE_STATUS=NOT_RUN_BLOCKED_UPSTREAM

未创建空白或替代媒体来凑数，也未使用 Preview 路由或 Next.js Dev Indicator 画面冒充生产证据。
