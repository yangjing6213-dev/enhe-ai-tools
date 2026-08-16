# 布局回归结果

## 扫描汇总

| 门禁 | 记录 | 失败 | 二维碰撞 | 最小相关间距 |
| --- | ---: | ---: | ---: | ---: |
| 强制文字模式 481—1440、双语两轮 | 46,080 | 0 | 0 | 12.453125px |
| 生产全宽排除扫描 | 16,440 | 0 | 0 | 12px |
| 全部产品所有卡片 | 500 | 0 | 0 | 29.453125px |
| 新品/精选所有 snap 卡片 | 126 | 0 | 0 | 29.453125px |
| 9 个关键宽度 | 216 | 0 | 0 | 12px |

“二维碰撞”要求水平与垂直区间同时交叉；原始 CSV 同时保留单轴 `intersection` 与 `verticalIntersection`，不能把单轴值单独当作遮挡。

## 全宽与边界

- 生产扫描覆盖 320—1440px 的 685 个去重宽度：移动区逐像素，并在 768/1024 与桌面区保持密集及关键点覆盖。
- `textClipped=0`、`rootOverflow=0`、`layoutChanged=0`、`repeatInstability=0`。
- 分数宽度 767.5/768.5/1024.5 共 12 条：失败 0、缺失目标 0、无效几何 0、碰撞 0，最小间距 12.453125px。
- 483px 为图标模式，484px 为文字模式；768px 精确使用两列合同，768px 之后使用三列，1024px 之后使用四列。

## 全部产品

- 25 条安全 fixture 分页为 12/12/1；中英文、3 页、9 个关键宽度全部检查。
- `RIGHT_COLUMN_EXCLUSION_MISSING=0`
- `NON_RIGHT_COLUMN_UNEXPECTED_EXCLUSION=0`
- `PAGE_COUNT_FAILURES=0`
- 卡片宽、grid 宽、href、44px 操作高度与基线匹配。

## 横向 rail

- 新品与精选共 126 条，逐张进入 snap 位置。
- `FEATURED_RAIL_WIDTH_CHANGED=NO`
- `NEW_RELEASES_RAIL_WIDTH_CHANGED=NO`
- 卡片宽、rail client/scrollWidth、scroll-snap、ArrowLeft/ArrowRight 不变；自动滚动 0。

## 其他目标

产品链接、分页/Load more、Footer、移动菜单、首页品牌 CTA 和产品控制均无碰撞。首页 hero CTA 与评价控制没有达到接入条件，因此保持原布局。产品图片、卡片宽度、grid、rail、gap、产品顺序和视觉设计均未改变。

