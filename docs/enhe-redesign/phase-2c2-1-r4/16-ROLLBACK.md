# 回滚

R4 是两个连续、独立提交：

1. `4662af4a1280b19a38f04a2f01bab1bcca815726` — 生产实现与直接测试。
2. 本目录的文档提交 — 证据与截图，不含源码。

如在后续 staging 发现不可接受回归，应在保存现场证据后按反向顺序创建普通 revert：

```text
git revert <R4-docs-commit>
git revert 4662af4a1280b19a38f04a2f01bab1bcca815726
```

不要使用 `reset --hard`、强制 checkout 或删除 worktree；不要改写 R、R2、R3 的 BLOCKED 文档/隔离目录。回滚后至少重跑 lint、typecheck、客服/软件/首页定向测试、完整套件、build 和正式路由浏览器检查。

本文件只是回滚说明，本轮没有执行 revert、部署、push 或 remote 修改。

