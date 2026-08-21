# Brand Motion Cohesion Review

审查方式：依据 emil-design-eng，对三个正式动效进行只读一致性审查；未提出第四个动效，也未修改源码。

## 动效性格

- origin-aware-layer 用小幅、触发源相关的位移解释分类层来源。
- directional-slide 用 12px 方向线索解释产品顺序，keyboard 路径为 0ms，避免高频操作拖沓。
- directional-drawer 用抽屉与 overlay 的非对称时长表达进入/退出层级。
- 三者均小于 300ms，使用 transform/opacity，reduced motion 统一为 80ms opacity-only。
- 无新 autoplay、装饰性呼吸、全局 glow 或页面级入场。

纯品牌动效语言的判断为一致：克制、清晰、有方向感、响应迅速。

## 阻断判断

最终一致性审查不能忽略动效承载内容与邻接交互：首页 SSR 不完整，分类 Layer 在 390px 覆盖客服入口。这两项需要生产源码修复。

    BRAND_MOTION_STYLE_SUBREVIEW=PASS
    BRAND_MOTION_COHESION_STATUS=BLOCKED
    REASON=SOURCE_CORRECTION_REQUIRED_FOR_FINAL_INTEGRATION

这是验收阻断，不是对新增动效的建议。
