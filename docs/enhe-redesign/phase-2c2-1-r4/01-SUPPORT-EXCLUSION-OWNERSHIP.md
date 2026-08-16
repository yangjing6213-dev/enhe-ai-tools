# 客服排除区所有权

| 字段 | 所有者 / 事实 |
| --- | --- |
| `supportComponent` | `src/components/customer-support-widget.tsx` |
| `supportStyle` | `src/styles/redesign/shell.css` |
| `supportMount` | `src/components/public-site-chrome.tsx:71` |
| `supportPanel` | 与入口同属 `CustomerSupportWidget`，未创建第二套组件 |
| `localeSource` | `src/lib/customer-support.ts`，挂载方调用 `getCustomerSupportFaqs(forceLocale)` |
| `mobileSize` | 44×44px；可见标签隐藏，`aria-label` 保留 |
| `desktopSize` | 中文 88×46px；英文 95.546875×46px |
| `mobileBreakpoint` | 客服模式边界为 484px；页面栅格边界 768px 与其独立 |
| `zIndex` | 桌面入口沿用 `z-[70]`；生产移动入口为 10；分类 overlay/panel 为 20/21；移动菜单 overlay/sheet 为 39/40 |
| `safeArea` | `<768px` 使用 `env(safe-area-inset-right/bottom)`，入口偏移为 16px + safe area |
| `sharedCardComponent` | `src/components/redesign/software/EnheRedesignSoftwareCard.tsx` |
| `sharedActionClass` | `.redesign-software-card-link` |
| `featuredActionComponent` | 共享卡片，`sectionId="featured-products"` |
| `newReleaseActionComponent` | 共享卡片，`sectionId="new-releases"` |
| `allProductsActionComponent` | 共享卡片，`sectionId="all-products"` |
| `paginationComponent` | `src/components/redesign/software/EnheRedesignSoftwareCatalog.tsx` 的 `.redesign-software-load-row` |
| `footerComponent` | `src/components/redesign/enhe-redesign-footer.tsx`；仅使用既有精确 class，不增加通用标记 |
| `homeControls` | 产品轮播 `.redesign-home-product-control`；品牌 CTA 在 `EnheRedesignBrandValue.tsx` 有明确标记 |

## 真实布局

- `<768px`：全部产品单列，每张卡都是最右列；新品与精选为横向 scroll-snap rail。
- `768px`：两列，最右列为每行第 2 张。
- `768px < width <= 1024px`：三列，最右列为每行第 3 张。
- `width > 1024px`：四列，最右列为每行第 4 张。
- rail 卡片可逐张滚动到右侧客服区域，因此新品和精选的每张操作区都进入统一机制。

## 条件目标

几何扫描授权接入的最小范围为：分页/Load more wrapper、Footer 右侧可见内容、首页品牌 CTA、首页产品轮播控制。首页 hero CTA 与评价控制在相关垂直区间内没有小于 8px 的间距或二维碰撞，因此未增加排除规则。所有选择器均为组件 class 或显式 `data-support-exclusion`；没有通用 `a`、通用 `button`、全局 `main` padding 或运行时定位。

