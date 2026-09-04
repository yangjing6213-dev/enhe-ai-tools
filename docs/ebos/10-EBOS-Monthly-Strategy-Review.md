# EBOS Monthly Strategy Review

## 1. 作用

Monthly Strategy Review 是 EBOS 的月度经营复盘入口。它把 weekly report、health snapshot、data-source readiness 和后续 revenue/product/SEO/GEO evidence 汇总为一个可执行的月度战略判断。

## 2. 为什么必须读取 latest-evidence-catalog.json

月度复盘不能直接依赖某个脚本的输出目录。它必须优先读取 `reports/ebos/evidence/catalog/latest-evidence-catalog.json`，因为 catalog 已经统一索引 evidence kind、日期、分数、confidence、warnings 和 action items。

## 3. 如何使用 weekly/health/data-source evidence

- `weekly_report`：提供本月执行状态、open action items 和经营方向。
- `health_snapshot`：提供构建、类型检查、EBOS 测试和关键页面健康基础。
- `data_source_readiness`：提供经营数据源缺口。

当前阶段这三类 evidence 是月度复盘的最低输入。缺任何一类都不报错，但必须生成 `dataGaps` 和 warnings。

## 4. Evidence 不足时如何解读

当 evidence 数量不足、缺少 revenue/product/SEO/GEO evidence 时，月度复盘只能作为方向性判断。它不允许伪造收入、流量、订单或转化结论。

## 5. 下月 OKR 生成规则

- 样本不足：生成“补齐经营证据链” OKR。
- 缺 `revenue_evidence`：生成“建立收入数据证据” OKR。
- 缺 `product_evidence`：生成“建立产品转化证据” OKR。
- 缺 `seo_evidence` 或 `geo_evidence`：生成“接入 SEO/GEO 数据源” OKR。
- open action items 较多：生成“减少执行积压” OKR。
- health score 较高：Keep Doing 包含“保持构建、类型检查、EBOS 测试健康”。

## 6. Codex Tasks 生成规则

Codex Tasks 只来自 evidence 缺口和执行积压，不凭空创建业务事实。每个任务必须有 reason、priority 和 owner。

## 7. 如何运行脚本

```bash
npx tsx scripts/generate-ebos-monthly-review.ts
```

可选指定日期：

```bash
npx tsx scripts/generate-ebos-monthly-review.ts --date 2026-07-15
```

输出：

- `reports/ebos/monthly/YYYY-MM-monthly-review.md`
- `reports/ebos/monthly/YYYY-MM-monthly-review.html`
- `reports/ebos/evidence/monthly_review/YYYY-MM-monthly_review.json`

## 8. 如何重新 index catalog

月度复盘生成后运行：

```bash
npx tsx scripts/index-ebos-evidence.ts
```

这样 `monthly_review` 会进入 latest catalog，后续 Dashboard 和 v2.0 Agent 可以直接读取。

## 9. Dashboard 和 v2.0 Agent 如何复用

Dashboard 可以读取 `latest-evidence-catalog.json` 的 `monthly_review` entry 展示月度评分、风险、OKR 数量和 evidence 使用量。

v2.0 Agent 可以先读取 catalog，再读取 monthly_review evidence envelope，作为后续自动任务编排、策略优先级排序和 action item 收敛的依据。
