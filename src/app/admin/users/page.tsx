import Link from "next/link";
import { AdminSection, inputClass, selectClass } from "@/app/admin/admin-ui";
import { buildAdminUserPageHref, buildAdminUserWhere, parseAdminUserListParams } from "@/lib/admin-list";
import { prisma } from "@/lib/db";
import { getCurrentLocale, type Locale } from "@/lib/i18n";

type AdminUsersSearchParams = Promise<Record<string, string | undefined>>;

const copy = {
  zh: {
    title: "用户管理",
    intro: "以清单模式管理注册用户。点击查看/编辑进入单独详情页，保留角色、状态、重置密码和账号删除能力。",
    deleted: "用户已删除。",
    error: "操作失败：{error}",
    search: "搜索邮箱、手机号或昵称",
    allRoles: "全部角色",
    allStatus: "全部状态",
    userRole: "普通用户",
    adminRole: "管理员",
    active: "启用",
    disabled: "禁用",
    filter: "筛选",
    total: "共 {total} 个用户，当前第 {page} / {pageCount} 页",
    previous: "上一页",
    next: "下一页",
    user: "用户",
    role: "角色",
    status: "状态",
    activityData: "订单 / 使用数据",
    action: "操作",
    noEmail: "未绑定邮箱",
    noPhone: "未绑定手机号",
    registeredAt: "注册于 {date}",
    counts: "{orders} 个订单 · {comments} 条评论 · 下载 {downloads} 次 · 在线使用 {usages} 次",
    viewEdit: "查看/编辑",
    empty: "暂无匹配用户。"
  },
  en: {
    title: "Users",
    intro: "Manage registered users in a list. Open a user detail page to edit role, status, password reset, and deletion.",
    deleted: "User deleted.",
    error: "Operation failed: {error}",
    search: "Search email, phone, or nickname",
    allRoles: "All roles",
    allStatus: "All statuses",
    userRole: "User",
    adminRole: "Admin",
    active: "Active",
    disabled: "Disabled",
    filter: "Filter",
    total: "{total} users, page {page} / {pageCount}",
    previous: "Previous",
    next: "Next",
    user: "User",
    role: "Role",
    status: "Status",
    activityData: "Orders / Usage",
    action: "Action",
    noEmail: "No email",
    noPhone: "No phone",
    registeredAt: "Registered {date}",
    counts: "{orders} orders · {comments} comments · {downloads} downloads · {usages} web uses",
    viewEdit: "View / Edit",
    empty: "No matching users."
  }
} as const;

export default async function AdminUsersPage({ searchParams }: { searchParams: AdminUsersSearchParams }) {
  const [params, locale] = await Promise.all([searchParams, getCurrentLocale()]);
  const t = copy[locale];
  const filters = parseAdminUserListParams(params);
  const where = buildAdminUserWhere(filters);
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        _count: { select: { orders: true, comments: true, downloadLogs: true, toolUsageLogs: true } }
      },
      orderBy: { createdAt: "desc" },
      skip: filters.skip,
      take: filters.take
    }),
    prisma.user.count({ where })
  ]);
  const pageCount = Math.max(1, Math.ceil(total / filters.pageSize));

  return (
    <AdminSection title={t.title} intro={t.intro}>
      {params.deleted ? (
        <p className="mb-5 rounded-xl border border-[#48F5D3]/30 bg-[#48F5D3]/10 px-4 py-3 text-sm text-[#48F5D3]">
          {t.deleted}
        </p>
      ) : null}
      {params.error ? (
        <p className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {t.error.replace("{error}", params.error)}
        </p>
      ) : null}

      <form className="glass grid gap-4 rounded-2xl p-6 md:grid-cols-[1fr_160px_160px_120px]">
        <input name="q" defaultValue={filters.q} placeholder={t.search} className={inputClass} />
        <select name="role" defaultValue={filters.role ?? ""} className={selectClass}>
          <option value="">{t.allRoles}</option>
          <option value="user">{t.userRole}</option>
          <option value="admin">{t.adminRole}</option>
        </select>
        <select name="status" defaultValue={filters.status ?? ""} className={selectClass}>
          <option value="">{t.allStatus}</option>
          <option value="active">{t.active}</option>
          <option value="disabled">{t.disabled}</option>
        </select>
        <button className="rounded-full bg-[#7AA7FF] px-5 py-3 text-sm font-semibold text-[#07101f]">{t.filter}</button>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-[#8B95A7]">
        <span>{formatTotal(t.total, total, filters.page, pageCount)}</span>
        <div className="flex gap-2">
          <Link
            href={buildAdminUserPageHref(filters, filters.page - 1)}
            aria-disabled={filters.page <= 1}
            className={`rounded-full border border-white/12 px-4 py-2 ${filters.page <= 1 ? "pointer-events-none opacity-40" : ""}`}
          >
            {t.previous}
          </Link>
          <Link
            href={buildAdminUserPageHref(filters, filters.page + 1)}
            aria-disabled={filters.page >= pageCount}
            className={`rounded-full border border-white/12 px-4 py-2 ${filters.page >= pageCount ? "pointer-events-none opacity-40" : ""}`}
          >
            {t.next}
          </Link>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-white/12 bg-white/6">
        <div className="grid min-w-[920px] grid-cols-[1.6fr_0.8fr_0.8fr_1.1fr_0.6fr] gap-4 border-b border-white/10 px-5 py-3 text-xs uppercase tracking-wide text-[#8B95A7]">
          <span>{t.user}</span>
          <span>{t.role}</span>
          <span>{t.status}</span>
          <span>{t.activityData}</span>
          <span className="text-right">{t.action}</span>
        </div>
        {users.length ? (
          <div className="min-w-[920px] divide-y divide-white/10">
            {users.map((user) => (
              <div key={user.id} className="grid grid-cols-[1.6fr_0.8fr_0.8fr_1.1fr_0.6fr] gap-4 px-5 py-4 text-sm transition hover:bg-white/5">
                <div>
                  <p className="font-semibold text-[#E8EEF8]">{user.nickname || user.email || user.phone || user.id}</p>
                  <p className="mt-1 text-xs text-[#8B95A7]">{user.email ?? t.noEmail} · {user.phone ?? t.noPhone}</p>
                  <p className="mt-1 text-xs text-[#8B95A7]">{t.registeredAt.replace("{date}", formatDate(user.createdAt, locale))}</p>
                </div>
                <div className="text-[#C5D0E2]">{roleLabel(user.role, locale)}</div>
                <div className="text-[#C5D0E2]">{statusLabel(user.status, locale)}</div>
                <div className="text-xs leading-6 text-[#8B95A7]">
                  {formatCounts(t.counts, user._count.orders, user._count.comments, user._count.downloadLogs, user._count.toolUsageLogs)}
                </div>
                <div className="text-right">
                  <Link href={`/admin/users/${user.id}`} className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-[#E8EEF8] transition hover:border-[#48F5D3]/50 hover:text-[#48F5D3]">
                    {t.viewEdit}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-10 text-center text-sm text-[#8B95A7]">{t.empty}</div>
        )}
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

function formatTotal(template: string, total: number, page: number, pageCount: number) {
  return template
    .replace("{total}", String(total))
    .replace("{page}", String(page))
    .replace("{pageCount}", String(pageCount));
}

function formatCounts(template: string, orders: number, comments: number, downloads: number, usages: number) {
  return template
    .replace("{orders}", String(orders))
    .replace("{comments}", String(comments))
    .replace("{downloads}", String(downloads))
    .replace("{usages}", String(usages));
}
