# Rollback

以下仅为回滚说明，D4 未执行任何回滚。

## 只回滚 D4

在获得授权后，从 D4 分支按逆序：

1. revert 文档提交 docs(motion): close phase 2C.3D production motion acceptance。
2. revert bd5d194c4d635f2192167bca07379d58457034db。

使用 git revert 保留历史；不要使用 reset --hard 或强制 checkout。

## 逆序回滚正式动效

仅在另行授权且确认依赖后：

1. ac39487ecec451f2ef9408884fa17f8cffdf9ff3
2. 49bbd837edbd5a5d39b13485ad628b477e09490c
3. f895dbee6434eb07ec1414e06997353973b2c1c4
4. a7392be8b94e752eb46cd70ac80b54cc4f0fcba3
5. 6f36cc1403c4a4404ac23cf049e20f3c97a124fd
6. 5938b2f6da0c50a2dac08ea4d0bf31f367e169f3

每一步先检查工作树、后续依赖和回滚 diff。D4 当前建议不是回滚 D1-D3，而是在独立 D4R 中最小修复两个精确缺陷并重新验收。
