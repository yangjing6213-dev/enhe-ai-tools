# Final Motion Contract Matrix

| 模块 | Variant | Pointer | Keyboard | Reduced motion | 位移与层级 |
| --- | --- | --- | --- | --- | --- |
| Category Layer | origin-aware-layer | desktop 190ms；mobile 230ms | 100ms | 80ms linear，opacity only | desktop scale 0.98→1、y 4→0、trigger origin；mobile y 12→0 |
| Home Product Stage | directional-slide | 240ms | 0ms | 80ms linear，opacity only | forward old x 0→-12、new x 12→0；backward 反向 |
| Mobile Navigation | directional-drawer | drawer 230/190ms；overlay 180/160ms | 100ms | 80ms linear，opacity only | drawer z40、overlay z39、support z10 |

    CATEGORY_AUTOPLAY=NO
    PRODUCT_STAGE_AUTOPLAY=NO
    MOBILE_NAV_AUTOPLAY=NO

最终浏览器矩阵合同：

- 路由：/、/en、/software、/en/software。
- 宽度：320、390、480、483、484、767、768、769、1024、1440。
- modality：pointer、keyboard、prefers-reduced-motion。
- 正交矩阵：4×10×3=120 个 case。
- 压力下限：Category 30、Product 30、Nav 30、Cross-module 20。

静态合同和 120-case modality/viewport 矩阵通过；最终集成仍因 SSR 与客服交叉阻断。
