import { ShieldAlert } from "lucide-react";
import {
  apiKeys,
  billingOrders,
  dashboardMetrics,
  developerProfile,
  quickActions,
  referrals,
  requestLogs,
  usageTrend,
  walletBreakdown
} from "../mock-data";
import { ActionLink, ApiPanel, ApiSectionHeading, MetricCard, MockNotice, PrimaryActionLink, StatusBadge } from "./shared";
import { CopyButton } from "./copy-button";
import { MockActionButton } from "./mock-action-button";

export function ConsoleOverviewPage() {
  return (
    <div className="space-y-6">
      <ApiSectionHeading title="ENHE API 概览" intro="这里是阶段 3 mock 控制台首页，用于验证信息架构、导航和数据展示密度。" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {dashboardMetrics.map((item) => <MetricCard key={item.label} {...item} />)}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <ApiPanel title="最近 6 条请求" description="日志只展示元数据，不展示完整 API Key 或请求正文。">
          <RequestLogTable compact />
        </ApiPanel>
        <ApiPanel title="快捷入口">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {quickActions.map((action) => <ActionLink key={action.href} href={action.href}>{action.label}</ActionLink>)}
          </div>
        </ApiPanel>
      </div>

      <MockNotice>控制台首页暂不校验登录态，不读取数据库，所有指标均来自 mock 数据。</MockNotice>
    </div>
  );
}

export function KeysPage() {
  return (
    <div className="space-y-6">
      <ApiSectionHeading title="API 密钥" intro="完整 API Key 只会在创建时显示一次。列表、日志和后台均只显示 prefix。" />
      <ApiPanel
        title="密钥列表"
        description={`API Key 数量：${apiKeys.length}/20`}
        action={<MockActionButton label="创建密钥" message="后续接入真实创建逻辑。此处不会生成真实 API Key。" />}
      >
        <MockNotice>请在创建后立即保存完整 API Key。刷新页面后只能看到 prefix。</MockNotice>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="text-xs font-black text-[var(--marketing-muted)]">
              <tr className="border-b border-white/10">
                <th className="py-3 pr-4">名称</th>
                <th className="py-3 pr-4">key prefix</th>
                <th className="py-3 pr-4">创建时间</th>
                <th className="py-3 pr-4">最后使用</th>
                <th className="py-3 pr-4">今日用量</th>
                <th className="py-3 pr-4">状态</th>
                <th className="py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {apiKeys.map((key) => (
                <tr key={key.id} className="text-[var(--marketing-text)]">
                  <td className="py-4 pr-4 font-black">{key.name}</td>
                  <td className="py-4 pr-4 font-mono text-xs">{key.prefix}</td>
                  <td className="py-4 pr-4 text-[var(--marketing-muted)]">{key.createdAt}</td>
                  <td className="py-4 pr-4 text-[var(--marketing-muted)]">{key.lastUsedAt}</td>
                  <td className="py-4 pr-4">{key.todayUsage}</td>
                  <td className="py-4 pr-4"><StatusBadge status={key.status} /></td>
                  <td className="py-4">
                    <div className="flex flex-wrap gap-2">
                      <CopyButton value={key.prefix} label="复制 prefix" />
                      <MockActionButton label="撤销" variant="danger" message="mock 撤销提示：后续接入真实撤销逻辑。" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ApiPanel>
    </div>
  );
}

export function UsagePage() {
  const maxRequests = Math.max(...usageTrend.map((point) => point.requests));

  return (
    <div className="space-y-6">
      <ApiSectionHeading title="用量与额度" intro="展示钱包余额、消费窗口和最近 7 天趋势。正式实现后需由钱包和日志事实源生成。" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {walletBreakdown.map((item) => <MetricCard key={item.label} {...item} />)}
      </div>
      <ApiPanel title="最近 7 天用量趋势" description="柱形高度基于 mock 请求数，费用以 mock 额度展示。">
        <div className="grid min-h-64 items-end gap-3 sm:grid-cols-7">
          {usageTrend.map((point) => (
            <div key={point.day} className="flex h-full min-h-48 flex-col justify-end rounded-2xl border border-white/10 bg-white/6 p-3">
              <div
                className="rounded-xl bg-[var(--marketing-accent)]/85"
                style={{ height: `${Math.max(18, (point.requests / maxRequests) * 150)}px` }}
                aria-label={`${point.day} ${point.requests} requests`}
              />
              <p className="mt-3 text-xs font-black text-[var(--marketing-text)]">{point.day}</p>
              <p className="text-xs text-[var(--marketing-muted)]">{point.requests} 次</p>
              <p className="text-xs text-[var(--marketing-muted)]">${point.credit.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </ApiPanel>
      <div className="flex flex-wrap gap-3">
        <PrimaryActionLink href="/user/api/billing">购买额度</PrimaryActionLink>
        <ActionLink href="/user/api/referrals">邀请好友</ActionLink>
      </div>
    </div>
  );
}

export function LogsPage() {
  return (
    <div className="space-y-6">
      <ApiSectionHeading title="请求日志" intro="用于验证调用是否成功、排查余额不足、限流、模型关闭和鉴权错误。" />
      <ApiPanel title="筛选" description="筛选 UI 为 mock，不向后端发起查询。">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="text-sm font-bold text-[var(--marketing-muted)]">
            搜索 request_id / path / model
            <input className="form-control-dark mt-2" placeholder="req_enhe 或 /v1/messages" />
          </label>
          <label className="text-sm font-bold text-[var(--marketing-muted)]">
            状态码
            <select className="form-select-dark mt-2" defaultValue="all">
              <option value="all">全部</option>
              <option value="200">200</option>
              <option value="402">402</option>
              <option value="429">429</option>
            </select>
          </label>
          <label className="text-sm font-bold text-[var(--marketing-muted)]">
            API Key
            <select className="form-select-dark mt-2" defaultValue="all">
              <option value="all">全部 prefix</option>
              {apiKeys.map((key) => <option key={key.id} value={key.prefix}>{key.prefix}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold text-[var(--marketing-muted)]">
            开始时间
            <input className="form-control-dark mt-2" type="date" />
          </label>
          <label className="text-sm font-bold text-[var(--marketing-muted)]">
            结束时间
            <input className="form-control-dark mt-2" type="date" />
          </label>
        </div>
      </ApiPanel>
      <ApiPanel title="日志列表">
        <RequestLogTable />
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--marketing-muted)]">
          <span>第 1 页，共 1 页</span>
          <div className="flex gap-2">
            <button className="rounded-full border border-white/14 px-4 py-2 font-black" type="button">上一页</button>
            <button className="rounded-full border border-white/14 px-4 py-2 font-black" type="button">下一页</button>
          </div>
        </div>
      </ApiPanel>
    </div>
  );
}

export function BillingPage() {
  return (
    <div className="space-y-6">
      <ApiSectionHeading title="套餐与账单" intro="支付入口均为 mock。阶段 3 不接入真实支付，不创建订单。" />
      <div className="grid gap-4 lg:grid-cols-3">
        <MetricCard label="当前套餐" value="Pro" helper="mock 当前方案" />
        <MetricCard label="到期时间" value="2026-08-01" helper="续费前保留服务" />
        <MetricCard label="付款方式" value="ZPAY / 手动开通" helper="阶段 3 不调用真实支付" />
      </div>
      <ApiPanel
        title="订单/发票列表"
        action={<div className="flex flex-wrap gap-2"><MockActionButton label="套餐升级" message="mock：后续接入真实套餐升级。" /><MockActionButton label="充值额度" message="mock：后续接入真实充值入口。" variant="secondary" /></div>}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-xs font-black text-[var(--marketing-muted)]">
              <tr className="border-b border-white/10">
                <th className="py-3 pr-4">订单号</th>
                <th className="py-3 pr-4">项目</th>
                <th className="py-3 pr-4">金额</th>
                <th className="py-3 pr-4">状态</th>
                <th className="py-3">时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {billingOrders.map((order) => (
                <tr key={order.id}>
                  <td className="py-4 pr-4 font-mono text-xs text-[var(--marketing-text)]">{order.id}</td>
                  <td className="py-4 pr-4 font-black text-[var(--marketing-text)]">{order.item}</td>
                  <td className="py-4 pr-4 text-[var(--marketing-text)]">{order.amount}</td>
                  <td className="py-4 pr-4"><StatusBadge status={order.status} /></td>
                  <td className="py-4 text-[var(--marketing-muted)]">{order.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ApiPanel>
    </div>
  );
}

export function ReferralsPage() {
  const inviteUrl = "https://www.enhe-tech.com.cn/ai-api?ref=dev_enhe_42k9";

  return (
    <div className="space-y-6">
      <ApiSectionHeading title="推荐奖励" intro="好友完成验证并产生首次有效 API 调用后，双方获得基础额度奖励。" />
      <ApiPanel title="邀请链接" description="链接为 mock。复制动作只复制页面内字符串，不写入后端。">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-[#14161b] p-4">
          <code className="min-w-0 flex-1 break-all text-sm font-bold text-[var(--marketing-text)]">{inviteUrl}</code>
          <CopyButton value={inviteUrl} label="复制邀请链接" />
        </div>
      </ApiPanel>
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="已赚额度" value="$2.00" helper="已发放到推荐余额" />
        <MetricCard label="待发额度" value="$2.00" helper="待验证或待首次调用" />
        <MetricCard label="已邀请人数" value="4" helper="mock 记录" />
      </div>
      <ApiPanel title="推荐记录列表">
        <div className="grid gap-3">
          {referrals.map((record) => (
            <div key={record.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/6 p-4">
              <div>
                <p className="font-black text-[var(--marketing-text)]">{record.user}</p>
                <p className="mt-1 text-xs text-[var(--marketing-muted)]">{record.createdAt} · {record.reward}</p>
              </div>
              <StatusBadge status={record.status} />
            </div>
          ))}
        </div>
      </ApiPanel>
      <ApiPanel title="规则与反作弊说明">
        <div className="grid gap-3 md:grid-cols-2">
          <Rule title="发放条件" text="好友完成验证并产生首次有效 API 调用后，基础奖励进入双方额度流水。" />
          <Rule title="待审核场景" text="同设备、同 IP hash、异常批量注册等风险信号会进入人工审核。" />
          <Rule title="不可重复发放" text="同一好友只能产生一次基础奖励，重复注册不重复发放。" />
          <Rule title="可冻结异常链路" text="管理员可冻结异常推荐关系，后续阶段接入真实风控和审计。" />
        </div>
      </ApiPanel>
    </div>
  );
}

export function ProfilePage() {
  return (
    <div className="space-y-6">
      <ApiSectionHeading title="开发者资料" intro="用于展示开发者 ID、联系信息和 API 状态。编辑入口为 mock。" />
      <ApiPanel title="资料信息" action={<MockActionButton label="编辑显示名称" message="mock：后续接入真实资料保存逻辑。" />}>
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--marketing-accent)] text-2xl font-black text-white">
            {developerProfile.avatarInitials}
          </div>
          <div className="min-w-0">
            <h2 className="text-2xl font-black text-[var(--marketing-text)]">{developerProfile.displayName}</h2>
            <p className="mt-2 text-sm font-semibold text-[var(--marketing-muted)]">{developerProfile.email}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <code className="rounded-full border border-white/14 bg-white/8 px-3 py-1.5 text-xs font-black text-[var(--marketing-text)]">{developerProfile.developerId}</code>
              <StatusBadge status={developerProfile.status === "active" ? "active" : "review"} />
            </div>
          </div>
        </div>
      </ApiPanel>
      <ApiPanel title="开发者资料初始化">
        <div className="grid gap-4 md:grid-cols-3">
          <Rule title="状态" text="mock 资料已初始化。正式实现后首次进入控制台会引导初始化。" />
          <Rule title="权限" text="资料只属于当前 ENHE 登录用户，不能通过前端传 user_id 访问他人数据。" />
          <Rule title="隐私" text="MVP 默认不保存请求正文，只保存必要日志元数据。" />
        </div>
      </ApiPanel>
    </div>
  );
}

function RequestLogTable({ compact = false }: { compact?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="text-xs font-black text-[var(--marketing-muted)]">
          <tr className="border-b border-white/10">
            <th className="py-3 pr-4">时间</th>
            <th className="py-3 pr-4">方法</th>
            <th className="py-3 pr-4">路径</th>
            <th className="py-3 pr-4">模型</th>
            <th className="py-3 pr-4">API Key prefix</th>
            {!compact ? <th className="py-3 pr-4">token 明细</th> : null}
            <th className="py-3 pr-4">费用</th>
            <th className="py-3 pr-4">延迟</th>
            <th className="py-3 pr-4">状态码</th>
            <th className="py-3">request_id</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {requestLogs.map((log) => (
            <tr key={log.id}>
              <td className="py-4 pr-4 text-[var(--marketing-muted)]">{log.time}</td>
              <td className="py-4 pr-4 font-black text-[var(--marketing-text)]">{log.method}</td>
              <td className="py-4 pr-4 font-mono text-xs text-[var(--marketing-text)]">{log.path}</td>
              <td className="py-4 pr-4 text-[var(--marketing-text)]">{log.model}</td>
              <td className="py-4 pr-4 font-mono text-xs text-[var(--marketing-muted)]">{log.keyPrefix}</td>
              {!compact ? <td className="py-4 pr-4 text-[var(--marketing-muted)]">{log.tokens}</td> : null}
              <td className="py-4 pr-4 text-[var(--marketing-text)]">{log.cost}</td>
              <td className="py-4 pr-4 text-[var(--marketing-muted)]">{log.latency}</td>
              <td className="py-4 pr-4"><span className="rounded-full bg-white/8 px-2.5 py-1 text-xs font-black text-[var(--marketing-text)]">{log.statusCode}</span></td>
              <td className="py-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[var(--marketing-muted)]">{log.requestId}</span>
                  <CopyButton value={log.requestId} label="复制" className="px-2 py-1" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Rule({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
      <h3 className="flex items-center gap-2 text-sm font-black text-[var(--marketing-text)]">
        <ShieldAlert size={16} className="text-[var(--marketing-accent)]" aria-hidden="true" />
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-[var(--marketing-muted)]">{text}</p>
    </div>
  );
}
