import { updateDeveloperDisplayNameAction } from "@/app/user/api/profile/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { ApiPanel, ApiSectionHeading, StatusBadge } from "@/features/enhe-api/components/shared";

type ApiDeveloperStatus = "active" | "suspended" | "closed";

export type DeveloperProfileView = {
  displayName: string;
  email: string | null;
  developerId: string;
  status: ApiDeveloperStatus;
  createdAt: Date;
};

export function DeveloperProfilePage({
  profile,
  message,
  error
}: {
  profile: DeveloperProfileView;
  message?: string | null;
  error?: string | null;
}) {
  return (
    <div className="space-y-6">
      <ApiSectionHeading title="开发者资料" intro="开发者资料来自当前 ENHE 登录账号。邮箱只用于展示，不能在此页面修改。" />
      {message ? <div className="status-success">{message}</div> : null}
      {error ? <div className="status-danger">{error}</div> : null}

      <ApiPanel title="资料信息">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--marketing-accent)] text-2xl font-black text-white">
            {getInitials(profile.displayName)}
          </div>
          <div className="min-w-0">
            <h2 className="text-2xl font-black text-[var(--marketing-text)]">{profile.displayName}</h2>
            <p className="mt-2 text-sm font-semibold text-[var(--marketing-muted)]">{profile.email ?? "未绑定邮箱"}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <code className="rounded-full border border-white/14 bg-white/8 px-3 py-1.5 text-xs font-black text-[var(--marketing-text)]">
                {profile.developerId}
              </code>
              <StatusBadge status={profile.status} />
            </div>
          </div>
        </div>
      </ApiPanel>

      <ApiPanel title="编辑显示名称" description="显示名称仅用于 ENHE API 控制台展示，不会修改你的登录邮箱。">
        <form action={updateDeveloperDisplayNameAction} className="grid max-w-xl gap-4">
          <label className="text-sm font-bold text-[var(--marketing-muted)]">
            显示名称
            <input
              name="displayName"
              className="form-control-dark mt-2"
              defaultValue={profile.displayName}
              maxLength={80}
              required
            />
          </label>
          <FormSubmitButton className="w-fit text-base" pendingLabel="保存中...">
            保存显示名称
          </FormSubmitButton>
        </form>
      </ApiPanel>

      <ApiPanel title="账号状态">
        <div className="grid gap-4 md:grid-cols-3">
          <ProfileFact label="Developer ID" value={profile.developerId} />
          <ProfileFact label="API 状态" value={getStatusText(profile.status)} />
          <ProfileFact label="创建时间" value={profile.createdAt.toLocaleString("zh-CN")} />
        </div>
      </ApiPanel>
    </div>
  );
}

function ProfileFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
      <p className="text-xs font-black text-[var(--marketing-muted)]">{label}</p>
      <p className="mt-2 break-all text-sm font-black text-[var(--marketing-text)]">{value}</p>
    </div>
  );
}

function getStatusText(status: ApiDeveloperStatus) {
  if (status === "suspended") return "已暂停";
  if (status === "closed") return "已关闭";
  return "启用";
}

function getInitials(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "EA";
  return trimmed.slice(0, 2).toUpperCase();
}
