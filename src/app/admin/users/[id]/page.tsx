import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteUserAdminAction, resetUserPasswordAction, updateUserAdminAction } from "@/app/admin/actions";
import { AdminSection, DangerButton, Field, inputClass, selectClass, SubmitButton } from "@/app/admin/admin-ui";
import { PasswordInput } from "@/components/password-input";
import { prisma } from "@/lib/db";
import { getCurrentLocale, type Locale } from "@/lib/i18n";

type AdminUserDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

const copy = {
  zh: {
    title: "用户详情",
    intro: "编辑用户基础信息、重置密码，或在确认风险后删除用户账号。",
    error: "操作失败：{error}",
    back: "返回用户清单",
    noEmail: "未绑定邮箱",
    noPhone: "未绑定手机号",
    adminRole: "管理员",
    userRole: "普通用户",
    active: "启用",
    disabled: "禁用",
    counts: "{orders} 个订单 · {comments} 条评论",
    usageCounts: "下载 {downloads} 次 · AI账号服务使用 {usages} 次",
    registeredAt: "注册于 {date}",
    nickname: "昵称",
    role: "角色",
    status: "状态",
    saveUser: "保存用户",
    resetPassword: "重置密码",
    passwordPlaceholder: "至少 8 位临时密码",
    deleteTitle: "删除用户",
    deleteIntro: "删除用户会清理该用户的订单、支付凭证、评论、下载记录、AI账号服务使用记录和登录会话。当前登录管理员不能删除自己，系统也会阻止删除最后一个管理员。",
    confirmDelete: "我已确认该用户可以删除，并理解相关业务记录会同步清理。",
    deleteUser: "删除用户"
  },
  en: {
    title: "User details",
    intro: "Edit profile basics, reset password, or delete the user after risk confirmation.",
    error: "Operation failed: {error}",
    back: "Back to user list",
    noEmail: "No email",
    noPhone: "No phone",
    adminRole: "Admin",
    userRole: "User",
    active: "Active",
    disabled: "Disabled",
    counts: "{orders} orders · {comments} comments",
    usageCounts: "{downloads} downloads · {usages} AI account service uses",
    registeredAt: "Registered {date}",
    nickname: "Nickname",
    role: "Role",
    status: "Status",
    saveUser: "Save user",
    resetPassword: "Reset password",
    passwordPlaceholder: "At least 8 temporary characters",
    deleteTitle: "Delete user",
    deleteIntro: "Deleting a user clears orders, payment proofs, comments, download logs, AI account service usage logs, and sessions. The current admin cannot delete themselves, and the system blocks deleting the last admin.",
    confirmDelete: "I confirm this user can be deleted and understand related business records will be cleaned up.",
    deleteUser: "Delete user"
  }
} as const;

export default async function AdminUserDetailPage({ params, searchParams }: AdminUserDetailPageProps) {
  const [{ id }, query, locale] = await Promise.all([params, searchParams, getCurrentLocale()]);
  const t = copy[locale];
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      _count: { select: { orders: true, comments: true, downloadLogs: true, toolUsageLogs: true } }
    }
  });
  if (!user) notFound();

  return (
    <AdminSection title={t.title} intro={t.intro}>
      {query.error ? (
        <p className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {t.error.replace("{error}", query.error)}
        </p>
      ) : null}

      <div className="mb-6">
        <Link href="/admin/users" className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-[#E8EEF8] transition hover:border-[#48F5D3]/50 hover:text-[#48F5D3]">
          {t.back}
        </Link>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold">{user.nickname || user.email || user.phone || user.id}</p>
            <p className="mt-2 text-sm text-[#8B95A7]">
              {user.email ?? t.noEmail} · {user.phone ?? t.noPhone}
            </p>
          </div>
          <div className="grid gap-1 text-right text-sm text-[#8B95A7]">
            <span>{roleLabel(user.role, locale)} · {statusLabel(user.status, locale)}</span>
            <span>{formatCounts(t.counts, user._count.orders, user._count.comments)}</span>
            <span>{formatUsageCounts(t.usageCounts, user._count.downloadLogs, user._count.toolUsageLogs)}</span>
            <span>{t.registeredAt.replace("{date}", formatDate(user.createdAt, locale))}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
          <form action={updateUserAdminAction} className="grid gap-4 md:grid-cols-3">
            <input type="hidden" name="id" value={user.id} />
            <Field label={t.nickname}>
              <input name="nickname" defaultValue={user.nickname ?? ""} className={inputClass} />
            </Field>
            <Field label={t.role}>
              <select name="role" defaultValue={user.role} className={selectClass}>
                <option value="user">{t.userRole}</option>
                <option value="admin">{t.adminRole}</option>
              </select>
            </Field>
            <Field label={t.status}>
              <select name="status" defaultValue={user.status} className={selectClass}>
                <option value="active">{t.active}</option>
                <option value="disabled">{t.disabled}</option>
              </select>
            </Field>
            <div className="md:col-span-3">
              <SubmitButton>{t.saveUser}</SubmitButton>
            </div>
          </form>

          <form action={resetUserPasswordAction} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <input type="hidden" name="id" value={user.id} />
            <Field label={t.resetPassword}>
              <PasswordInput
                name="password"
                minLength={8}
                required
                placeholder={t.passwordPlaceholder}
                className={inputClass}
              />
            </Field>
            <div className="mt-4">
              <SubmitButton>{t.resetPassword}</SubmitButton>
            </div>
          </form>
        </div>

        <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-400/10 p-4">
          <h3 className="font-semibold text-red-100">{t.deleteTitle}</h3>
          <p className="mt-2 text-sm leading-6 text-red-100/80">{t.deleteIntro}</p>
          <form action={deleteUserAdminAction} className="mt-4">
            <input type="hidden" name="id" value={user.id} />
            <label className="mb-4 flex gap-3 text-sm text-red-100">
              <input name="confirmDelete" type="checkbox" required value="DELETE_USER" className="mt-1" />
              <span>{t.confirmDelete}</span>
            </label>
            <DangerButton>{t.deleteUser}</DangerButton>
          </form>
        </div>
      </div>
    </AdminSection>
  );
}

function roleLabel(role: string, locale: Locale) {
  if (role === "admin") return copy[locale].adminRole;
  return copy[locale].userRole;
}

function statusLabel(status: string, locale: Locale) {
  if (status === "active") return copy[locale].active;
  return copy[locale].disabled;
}

function formatDate(value: Date, locale: Locale) {
  return value.toLocaleDateString(locale === "en" ? "en-US" : "zh-CN");
}

function formatCounts(template: string, orders: number, comments: number) {
  return template
    .replace("{orders}", String(orders))
    .replace("{comments}", String(comments));
}

function formatUsageCounts(template: string, downloads: number, usages: number) {
  return template
    .replace("{downloads}", String(downloads))
    .replace("{usages}", String(usages));
}
