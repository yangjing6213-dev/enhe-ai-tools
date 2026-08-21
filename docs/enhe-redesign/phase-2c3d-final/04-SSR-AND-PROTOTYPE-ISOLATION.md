# SSR and Prototype Isolation

## 无 JavaScript SSR

JavaScript 禁用的 Playwright context，390×844：

| 路由 | 结果 | 证据 |
| --- | --- | --- |
| / | FAIL | 五产品合同仅命中 ultimate-edition；缺 4 个产品 ID |
| /en | FAIL | 五产品合同仅命中 ultimate-edition；缺 4 个产品 ID |
| /software | PASS | 7 个分类按钮、产品列表、分页与正式导航存在 |
| /en/software | PASS | 7 个分类按钮、产品列表、分页与正式导航存在 |

首页缺失 ID：

- infinitetalk
- ai-voice
- lumi-os
- faceswap-studio

生产组件 src/components/redesign/home/EnheRedesignProductShowcase.tsx:424-425 仅渲染可选 previousProduct 和当前 product；初始 SSR 没有其余四个产品信息。

    SSR_ROUTE_CASES=4
    SSR_ROUTE_PASSED=2
    SSR_ROUTE_FAILED=2
    SSR_CORE_CONTENT_VISIBLE=NO
    SSR_CATEGORY_LINK_COUNT=7
    SSR_PRODUCT_STAGE_DEFAULT_VISIBLE=YES
    SSR_NAV_LINKS_PRESENT=YES

## Prototype 隔离

    PRODUCTION_SOURCE_REFERENCES_PROTOTYPE=NO
    PRODUCTION_NAV_REFERENCES_PROTOTYPE=NO
    SITEMAP_REFERENCES_PROTOTYPE=NO
    ROBOTS_REFERENCES_PROTOTYPE=NO
    PRODUCTION_BUNDLE_REFERENCES_PROTOTYPE=NOT_RUN_BLOCKED_UPSTREAM

源码级隔离 PASS。生产 Bundle 与 Preview 404 需要 Build/Standalone；因 SSR 首个硬门禁已失败，按失败流程未执行，不能写成 PASS。
