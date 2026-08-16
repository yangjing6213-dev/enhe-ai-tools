# 正式浏览器与视觉复核

## Standalone 浏览器矩阵

- 路由：`/`、`/en`、`/software`、`/en/software`、`/software?page=2`、`/en/software?page=2`。
- 宽度：320、360、390、480、483、484、767、768、1024、1440。
- 60/60 行通过；缺失目标 0；无效几何 0；二维碰撞 0。
- 最小相关水平间距 12px；文本裁切 0；root overflow 0。
- console error 0；page error 0；200% zoom、reduced-motion、菜单/面板/键盘/Escape/焦点返回通过。
- 页面文字中没有 Candidate 或 Preview。

## 正式截图

共 14 张 fullPage PNG：

- `zh/en-software-support-exclusion-320.png`
- `zh/en-software-support-exclusion-390.png`
- `zh/en-software-support-icon-max.png`（483px）
- `zh/en-software-support-text-min.png`（484px）
- `zh/en-home-support-exclusion-390.png`
- `zh/en-software-support-tablet-768.png`
- `zh/en-software-support-desktop-1440.png`

截图 harness 只移除 `nextjs-portal`，未隐藏客服、CTA 或应用内容。14/14 人工检查确认：320/390/483 为图标入口且无可见“客服/Chat”，484 起文字可见；产品 CTA、分页、Footer 和首页控制未被遮挡；768 两列和 1440 四列未退化；无横向溢出或 Next.js dev indicator。

`SCREENSHOT_COUNT=14`

`NEXT_DEV_INDICATOR_VISIBLE=NO`

