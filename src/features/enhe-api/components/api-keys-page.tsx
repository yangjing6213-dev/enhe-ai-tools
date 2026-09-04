"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createApiKeyAction, revokeApiKeyAction, type CreateApiKeyActionState } from "@/app/user/api/keys/actions";
import { ApiPanel, ApiSectionHeading, MockNotice, StatusBadge } from "./shared";
import { CopyButton } from "./copy-button";

type ApiDeveloperStatus = "active" | "suspended" | "closed";
type ApiKeyStatus = "active" | "revoked";

export type ApiKeysPageItem = {
  id: string;
  name: string;
  keyPrefix: string;
  status: ApiKeyStatus;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  todayRequestCount: number;
  todayUsageUsd: number;
};

type ApiKeysPageProps = {
  keys: ApiKeysPageItem[];
  activeCount: number;
  maxActiveKeys: number;
  developerStatus: ApiDeveloperStatus;
};

const initialCreateState: CreateApiKeyActionState = { status: "idle" };

export function ApiKeysPage({ keys, activeCount, maxActiveKeys, developerStatus }: ApiKeysPageProps) {
  const [createState, createFormAction] = useActionState(createApiKeyAction, initialCreateState);
  const currentActiveCount = createState.status === "success" ? createState.activeCount : activeCount;
  const isDeveloperActive = developerStatus === "active";
  const hasReachedLimit = currentActiveCount >= maxActiveKeys;
  const createDisabled = !isDeveloperActive || hasReachedLimit;

  return (
    <div className="space-y-6">
      <ApiSectionHeading
        title="API 密钥"
        intro="完整 API Key 只会在创建成功时显示一次。列表、日志和后台均只展示 prefix，不展示明文 Key。"
      />

      <ApiPanel title="创建 API Key" description={`启用状态 API Key 数量：${currentActiveCount}/${maxActiveKeys}`}>
        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <form action={createFormAction} className="grid gap-4">
            <label className="text-sm font-bold text-[var(--marketing-muted)]">
              Key 名称
              <input
                name="name"
                className="form-control-dark mt-2"
                maxLength={40}
                placeholder="例如：Codex 本机配置"
                required
                disabled={createDisabled}
              />
            </label>
            <CreateSubmitButton disabled={createDisabled} />
            {!isDeveloperActive ? (
              <p className="text-sm font-semibold leading-6 text-amber-100">当前开发者状态受限，暂不能创建新的 API Key。</p>
            ) : null}
            {hasReachedLimit ? (
              <p className="text-sm font-semibold leading-6 text-amber-100">已达到启用状态 API Key 数量上限，请先撤销不再使用的 Key。</p>
            ) : null}
            {createState.status === "error" ? <div className="status-danger">{createState.message}</div> : null}
          </form>

          <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
            {createState.status === "success" ? (
              <div className="space-y-4">
                <div className="status-success">{createState.message}</div>
                <div>
                  <p className="text-xs font-black uppercase tracking-normal text-[var(--marketing-muted)]">完整 API Key</p>
                  <code className="mt-2 block break-all rounded-2xl border border-[var(--marketing-accent)]/30 bg-[#101216] p-4 text-sm font-black text-[var(--marketing-text)]">
                    {createState.plainKey}
                  </code>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <CopyButton value={createState.plainKey} label="复制完整 Key" />
                  <span className="font-mono text-xs text-[var(--marketing-muted)]">{createState.keyPrefix}</span>
                </div>
              </div>
            ) : (
              <MockNotice>完整 API Key 不会被保存。创建成功后请立即复制，刷新页面后只能看到 prefix。</MockNotice>
            )}
          </div>
        </div>
      </ApiPanel>

      <ApiPanel title="密钥列表" description="今日请求数与今日用量将在阶段 6 接入真实日志后统计。">
        {keys.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/6 p-5">
            <p className="font-black text-[var(--marketing-text)]">还没有 API Key</p>
            <p className="mt-2 text-sm leading-6 text-[var(--marketing-muted)]">创建第一个 Key 后，可在 Codex、Claude Code、Cursor 或 Cline 中配置使用。</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="text-xs font-black text-[var(--marketing-muted)]">
                <tr className="border-b border-white/10">
                  <th className="py-3 pr-4">名称</th>
                  <th className="py-3 pr-4">key prefix</th>
                  <th className="py-3 pr-4">创建时间</th>
                  <th className="py-3 pr-4">最后使用</th>
                  <th className="py-3 pr-4">今日请求</th>
                  <th className="py-3 pr-4">今日用量</th>
                  <th className="py-3 pr-4">状态</th>
                  <th className="py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {keys.map((key) => (
                  <tr key={key.id} className="text-[var(--marketing-text)]">
                    <td className="py-4 pr-4 font-black">{key.name}</td>
                    <td className="py-4 pr-4 font-mono text-xs">{key.keyPrefix}</td>
                    <td className="py-4 pr-4 text-[var(--marketing-muted)]">{key.createdAt}</td>
                    <td className="py-4 pr-4 text-[var(--marketing-muted)]">{key.lastUsedAt ?? "尚未使用"}</td>
                    <td className="py-4 pr-4">{key.todayRequestCount}</td>
                    <td className="py-4 pr-4">{formatUsageUsd(key.todayUsageUsd)}</td>
                    <td className="py-4 pr-4"><StatusBadge status={key.status} /></td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-2">
                        <CopyButton value={key.keyPrefix} label="复制 prefix" />
                        <form action={revokeApiKeyAction}>
                          <input type="hidden" name="apiKeyId" value={key.id} />
                          <RevokeSubmitButton disabled={key.status === "revoked"} />
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ApiPanel>
    </div>
  );
}

function CreateSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="inline-flex w-fit items-center justify-center rounded-full border border-[var(--marketing-accent)] bg-[var(--marketing-accent)] px-5 py-3 text-sm font-black text-white transition disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "创建中..." : "创建 API Key"}
    </button>
  );
}

function RevokeSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      onClick={(event) => {
        if (!window.confirm("确认撤销这个 API Key？撤销后不能恢复，只能重新创建。")) {
          event.preventDefault();
        }
      }}
      className="inline-flex items-center justify-center rounded-full border border-red-400/35 bg-red-400/10 px-3 py-1.5 text-xs font-black text-red-100 transition hover:border-red-300 hover:bg-red-400/15 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "撤销中..." : disabled ? "已撤销" : "撤销"}
    </button>
  );
}

function formatUsageUsd(value: number) {
  return `$${value.toFixed(2)}`;
}
