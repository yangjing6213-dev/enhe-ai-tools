# 源码范围审计

## 生产文件：7/7

| 路径 | 必要性 |
| --- | --- |
| `src/components/customer-support-widget.tsx` | 图标/文字入口状态、aria、焦点约束与返回 |
| `src/components/redesign/enhe-redesign-mobile-menu.tsx` | pointer 打开时保存真实焦点并在关闭后返回 |
| `src/components/redesign/home/EnheRedesignBrandValue.tsx` | 仅为有碰撞证据的品牌 CTA 增加明确作用域 |
| `src/components/redesign/software/EnheRedesignSoftwareCard.tsx` | 共享操作区输出已有 sectionId 作用域 |
| `src/styles/redesign/home.css` | 品牌 CTA 最小静态排除区；精确 768px 边界 |
| `src/styles/redesign/shell.css` | 统一 token、safe area、入口模式、Footer/首页控件精确规则 |
| `src/styles/redesign/software.css` | rail、最右列、分页与分类层叠规则 |

没有修改 Footer、产品展示或 catalog 组件来添加冗余标记；已有精确 class 足以表达条件目标。这使生产文件数保持在硬上限 7。

## 直接测试与 helper：7

- `src/components/redesign/home/home-products.test.ts`
- `src/components/redesign/software/software-preview-regression.test.ts`
- `src/components/redesign/software/software-responsive.test.ts`
- `src/lib/customer-support-widget-source.test.ts`
- `tests/e2e/mobile-support-r2-harness.mjs`
- `tests/e2e/mobile-support-r4-harness.mjs`
- `tests/e2e/mobile-support-trigger.spec.ts`

代码提交 `4662af4a1280b19a38f04a2f01bab1bcca815726` 的统计为 14 个文件、3,966 行新增、26 行删除。较大的新增量来自可复用的只读几何矩阵和浏览器证据采集，不是生产运行时代码。

## 明确未修改

package、lockfile、`next.config`、Prisma/schema/migration、seed、产品数据、catalog adapter、12/页分页、分类、详情、下载、支付、OAuth、sitemap URL 集合、robots、canonical/hreflang、R-008、Heartbeat、Writer、`.env`、生产环境和 remote 均未修改。

`UNAUTHORIZED_PATHS=NONE`

`SUPPORT_EXCLUSION_RUNTIME_JS=NO`

最终 YAGNI 复核没有发现可删除而不破坏已验证目标的生产规则；没有为单次用途增加运行时抽象、observer、listener 或第二套客服组件。

