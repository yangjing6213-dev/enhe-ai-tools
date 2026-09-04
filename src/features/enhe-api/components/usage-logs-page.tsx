import Link from "next/link";
import type { UsageLogFilters, UsageLogListItem, UsageLogListResult } from "@/features/enhe-api/server/usage-logs";
import { ApiPanel, ApiSectionHeading, PrimaryActionLink } from "./shared";
import { CopyButton } from "./copy-button";

type UsageLogsPageProps = {
  result: UsageLogListResult;
};

export function UsageLogsPage({ result }: UsageLogsPageProps) {
  return (
    <div className="space-y-6">
      <ApiSectionHeading
        title="请求日志"
        intro="展示 ENHE API 请求元数据，用于验证调用是否成功、排查异常消耗、状态码和 request_id。MVP 不保存请求正文或响应正文。"
      />

      <ApiPanel title="筛选" description="所有查询都限定为当前登录用户的日志，筛选条件不会扩大访问范围。">
        <form action="/user/api/logs" className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input type="hidden" name="page" value="1" />
          <label className="text-sm font-bold text-[var(--marketing-muted)]">
            request_id
            <input name="request_id" className="form-control-dark mt-2" defaultValue={result.filters.requestId} placeholder="req_enhe_..." maxLength={128} />
          </label>
          <label className="text-sm font-bold text-[var(--marketing-muted)]">
            path
            <input name="path" className="form-control-dark mt-2" defaultValue={result.filters.path} placeholder="/v1/messages" maxLength={160} />
          </label>
          <label className="text-sm font-bold text-[var(--marketing-muted)]">
            model
            <input name="model" className="form-control-dark mt-2" defaultValue={result.filters.model} placeholder="enhe-coder-pro" maxLength={128} />
          </label>
          <label className="text-sm font-bold text-[var(--marketing-muted)]">
            状态码
            <select name="status_code" className="form-select-dark mt-2" defaultValue={result.filters.statusCode}>
              <option value="">全部</option>
              <option value="200">200</option>
              <option value="400">400</option>
              <option value="401">401</option>
              <option value="402">402</option>
              <option value="403">403</option>
              <option value="429">429</option>
              <option value="500">500</option>
              <option value="502">502</option>
            </select>
          </label>
          <label className="text-sm font-bold text-[var(--marketing-muted)]">
            API Key
            <select name="api_key_id" className="form-select-dark mt-2" defaultValue={result.filters.apiKeyId}>
              <option value="">全部 Key</option>
              {result.keyOptions.map((key) => (
                <option key={key.id} value={key.id}>{key.name} · {key.keyPrefix}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold text-[var(--marketing-muted)]">
            时间范围
            <select name="range" className="form-select-dark mt-2" defaultValue={result.filters.range}>
              <option value="24h">最近 24 小时</option>
              <option value="7d">最近 7 天</option>
              <option value="30d">最近 30 天</option>
            </select>
          </label>
          <label className="text-sm font-bold text-[var(--marketing-muted)]">
            每页
            <select name="page_size" className="form-select-dark mt-2" defaultValue={String(result.filters.pageSize)}>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--marketing-accent)] bg-[var(--marketing-accent)] px-5 text-sm font-black text-white"
            >
              应用筛选
            </button>
            <Link
              href="/user/api/logs"
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/14 bg-white/8 px-4 text-sm font-black text-[var(--marketing-text)]"
            >
              重置
            </Link>
          </div>
        </form>
      </ApiPanel>

      <ApiPanel title="日志列表" description={`共 ${result.totalCount} 条，当前第 ${result.filters.page} / ${result.totalPages} 页。`}>
        {result.items.length === 0 ? <EmptyLogsState /> : <UsageLogTable items={result.items} />}
        <PaginationControls result={result} />
      </ApiPanel>
    </div>
  );
}

function EmptyLogsState() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/6 p-5">
      <p className="font-black text-[var(--marketing-text)]">还没有请求日志</p>
      <p className="mt-2 text-sm leading-6 text-[var(--marketing-muted)]">
        请先创建 API Key，并在 Codex、Claude Code、Cursor 或 Cline 中完成一次调用。调用成功或失败后，可在这里通过 request_id、路径、模型和状态码排查。
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <PrimaryActionLink href="/user/api/keys">创建 API Key</PrimaryActionLink>
        <Link
          href="/user/api/docs"
          className="inline-flex items-center justify-center rounded-full border border-white/14 bg-white/8 px-5 py-3 text-sm font-black text-[var(--marketing-text)]"
        >
          查看配置文档
        </Link>
      </div>
    </div>
  );
}

function UsageLogTable({ items }: { items: UsageLogListItem[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1120px] text-left text-sm">
        <thead className="text-xs font-black text-[var(--marketing-muted)]">
          <tr className="border-b border-white/10">
            <th className="py-3 pr-4">时间</th>
            <th className="py-3 pr-4">方法</th>
            <th className="py-3 pr-4">路径</th>
            <th className="py-3 pr-4">模型</th>
            <th className="py-3 pr-4">API Key prefix</th>
            <th className="py-3 pr-4">token 明细</th>
            <th className="py-3 pr-4">费用</th>
            <th className="py-3 pr-4">延迟</th>
            <th className="py-3 pr-4">状态码</th>
            <th className="py-3">request_id</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {items.map((log) => (
            <tr key={log.id}>
              <td className="py-4 pr-4 text-[var(--marketing-muted)]">{formatDateTime(log.createdAt)}</td>
              <td className="py-4 pr-4 font-black text-[var(--marketing-text)]">{log.method}</td>
              <td className="py-4 pr-4 font-mono text-xs text-[var(--marketing-text)]">{log.path}</td>
              <td className="py-4 pr-4 text-[var(--marketing-text)]">{log.publicModelName ?? log.model ?? "-"}</td>
              <td className="py-4 pr-4 font-mono text-xs text-[var(--marketing-muted)]">{log.keyPrefix}</td>
              <td className="py-4 pr-4 text-[var(--marketing-muted)]">{formatTokenDetail(log)}</td>
              <td className="py-4 pr-4 text-[var(--marketing-text)]">{formatUsd(log.chargedUsd)}</td>
              <td className="py-4 pr-4 text-[var(--marketing-muted)]">{log.latencyMs === null ? "-" : `${log.latencyMs} ms`}</td>
              <td className="py-4 pr-4"><StatusCodeBadge statusCode={log.statusCode} /></td>
              <td className="py-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[var(--marketing-muted)]">{log.requestId}</span>
                  <CopyButton value={log.requestId} label="复制" className="px-2 py-1" />
                </div>
                {log.errorCode ? <p className="mt-1 text-xs text-red-200">{log.errorCode}</p> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaginationControls({ result }: { result: UsageLogListResult }) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--marketing-muted)]">
      <span>第 {result.filters.page} 页，共 {result.totalPages} 页</span>
      <div className="flex gap-2">
        {result.hasPreviousPage ? (
          <Link className="rounded-full border border-white/14 px-4 py-2 font-black" href={buildPageHref(result.filters, result.filters.page - 1)}>
            上一页
          </Link>
        ) : (
          <span className="rounded-full border border-white/10 px-4 py-2 font-black opacity-45">上一页</span>
        )}
        {result.hasNextPage ? (
          <Link className="rounded-full border border-white/14 px-4 py-2 font-black" href={buildPageHref(result.filters, result.filters.page + 1)}>
            下一页
          </Link>
        ) : (
          <span className="rounded-full border border-white/10 px-4 py-2 font-black opacity-45">下一页</span>
        )}
      </div>
    </div>
  );
}

function StatusCodeBadge({ statusCode }: { statusCode: number }) {
  const tone =
    statusCode >= 200 && statusCode < 300
      ? "border-[var(--marketing-accent)]/35 bg-[var(--marketing-accent)]/12 text-[var(--marketing-accent)]"
      : statusCode === 401 || statusCode === 403 || statusCode >= 500
        ? "border-red-300/25 bg-red-400/10 text-red-200"
        : "border-amber-300/30 bg-amber-300/10 text-amber-100";

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${tone}`}>{statusCode}</span>;
}

function formatTokenDetail(log: UsageLogListItem) {
  const base = `in ${log.inputTokens} / out ${log.outputTokens}`;
  const cacheParts = [];
  if (log.cacheReadTokens > 0) cacheParts.push(`cache read ${log.cacheReadTokens}`);
  if (log.cacheWriteTokens > 0) cacheParts.push(`cache write ${log.cacheWriteTokens}`);
  return cacheParts.length > 0 ? `${base} / ${cacheParts.join(" / ")}` : base;
}

function formatUsd(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `$${amount.toFixed(4)}` : "$0.0000";
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(value);
}

function buildPageHref(filters: UsageLogFilters, page: number) {
  const params = new URLSearchParams();
  setParam(params, "request_id", filters.requestId);
  setParam(params, "path", filters.path);
  setParam(params, "model", filters.model);
  setParam(params, "status_code", filters.statusCode);
  setParam(params, "api_key_id", filters.apiKeyId);
  setParam(params, "range", filters.range);
  setParam(params, "page_size", String(filters.pageSize));
  setParam(params, "page", String(page));
  return `/user/api/logs?${params.toString()}`;
}

function setParam(params: URLSearchParams, key: string, value: string) {
  if (value) params.set(key, value);
}
