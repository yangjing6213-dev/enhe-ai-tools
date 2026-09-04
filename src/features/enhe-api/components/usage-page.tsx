import { ActionLink, ApiPanel, ApiSectionHeading, MetricCard, PrimaryActionLink } from "./shared";
import type { WalletSummary } from "@/features/enhe-api/server/wallet";

type UsagePageProps = {
  summary: WalletSummary;
};

export function UsagePage({ summary }: UsagePageProps) {
  const maxTrendSpend = Math.max(...summary.trend.map((point) => Number(point.chargedUsd)), 0);

  return (
    <div className="space-y-6">
      <ApiSectionHeading
        title="用量与额度"
        intro="这里展示 ENHE API 钱包余额、近期消费窗口和最近 7 天用量趋势。金额来自钱包账本和请求日志聚合，不展示请求正文或完整 API Key。"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="总可用额度" value={formatUsd(summary.balances.totalAvailableUsd, 4)} helper="套餐、充值、推荐余额扣除锁定额度后的合计" />
        <MetricCard label="套餐余额" value={formatUsd(summary.balances.planBalanceUsd, 4)} helper="API 扣费优先消耗" />
        <MetricCard label="充值余额" value={formatUsd(summary.balances.rechargeBalanceUsd, 4)} helper="套餐余额之后消耗" />
        <MetricCard label="推荐余额" value={formatUsd(summary.balances.referralBalanceUsd, 4)} helper="最后消耗的奖励额度" />
        <MetricCard label="锁定额度" value={formatUsd(summary.balances.lockedBalanceUsd, 4)} helper="预留给后续风控或处理中扣费" />
        <MetricCard
          label="5 小时窗口消费"
          value={formatUsd(summary.windows.fiveHourChargedUsd, 4)}
          helper={`${summary.windows.fiveHourRequestCount} 次已计费请求`}
        />
        <MetricCard
          label="7 天窗口消费"
          value={formatUsd(summary.windows.sevenDayChargedUsd, 4)}
          helper={`${summary.windows.sevenDayRequestCount} 次已计费请求`}
        />
      </div>

      <ApiPanel title="最近 7 天用量趋势" description="按 UTC+8 自然日聚合 api_usage_logs 中已计费请求的 chargedUsd。">
        <div className="grid min-h-64 items-end gap-3 sm:grid-cols-7">
          {summary.trend.map((point) => {
            const charged = Number(point.chargedUsd);
            const barHeight = maxTrendSpend > 0 ? Math.max(18, (charged / maxTrendSpend) * 150) : 18;

            return (
              <div key={point.day} className="flex h-full min-h-48 flex-col justify-end rounded-2xl border border-white/10 bg-white/6 p-3">
                <div
                  className="rounded-xl bg-[var(--marketing-accent)]/85"
                  style={{ height: `${barHeight}px` }}
                  aria-label={`${point.day} charged ${formatUsd(point.chargedUsd, 4)}`}
                />
                <p className="mt-3 text-xs font-black text-[var(--marketing-text)]">{point.day}</p>
                <p className="text-xs text-[var(--marketing-muted)]">{point.requestCount} 次</p>
                <p className="text-xs text-[var(--marketing-muted)]">{formatUsd(point.chargedUsd, 4)}</p>
              </div>
            );
          })}
        </div>
      </ApiPanel>

      <div className="flex flex-wrap gap-3">
        <PrimaryActionLink href="/user/api/billing">购买额度</PrimaryActionLink>
        <ActionLink href="/user/api/referrals">邀请好友</ActionLink>
      </div>
    </div>
  );
}

function formatUsd(value: string, fractionDigits: number) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `$${amount.toFixed(fractionDigits)}` : "$0.0000";
}
