import Link from "next/link";
import {
  cancelOrderAction,
  changePasswordAction,
  logoutAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  updateNewsletterSettingsAction
} from "@/app/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { PasswordInput } from "@/components/password-input";
import { Container, SectionTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCurrentLocale, getDictionary, type Locale } from "@/lib/i18n";
import { getNotificationDisplay } from "@/lib/notification-display";
import { canUserCancelOrder } from "@/lib/order-rules";
import { buildCanonicalToolPath } from "@/lib/public-slugs";
import { reviewCompletionNotice, reviewCompletionNoticeEn } from "@/lib/review-copy";
import { buildUserToolEntitlements, type UserEntitlementTool } from "@/lib/user-entitlements";
import { formatCurrency } from "@/lib/utils";

export type UserCenterSearchParams = Promise<Record<string, string | undefined>>;

export async function UserCenterPageShell({
  searchParams,
  forceLocale
}: {
  searchParams: UserCenterSearchParams;
  forceLocale?: Locale;
}) {
  const params = await searchParams;
  const locale = forceLocale ?? (await getCurrentLocale());
  const t = getDictionary(locale);
  const passwordMessage = getPasswordMessage(params.password, locale);
  const orderMessage = params.order === "cancelled" ? (locale === "en" ? "Order cancelled." : "订单已取消。") : null;
  const user = await requireUser(locale);

  const [notifications, orders, downloads, usages, comments, purchases, publishedTools] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8
    }),
    prisma.order.findMany({
      where: { userId: user.id },
      include: { plan: true, tool: true, paymentProof: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.downloadLog.findMany({
      where: { userId: user.id },
      include: { tool: true },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    prisma.toolUsageLog.findMany({
      where: { userId: user.id },
      include: { tool: true },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    prisma.comment.findMany({
      where: { userId: user.id },
      include: { tool: true },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    prisma.toolPurchase.findMany({
      where: { userId: user.id },
      select: { toolId: true }
    }),
    prisma.tool.findMany({
      where: {
        status: "published",
        OR: [{ type: "software" }, { type: "online" }, { type: "skill_learning" }]
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }]
    })
  ]);

  const entitlementSummary = buildUserToolEntitlements({
    purchasedToolIds: purchases.map((purchase) => purchase.toolId),
    tools: publishedTools
  });
  const unreadNotificationCount = notifications.filter((notification) => !notification.readAt).length;
  const userCenterIntro =
    locale === "en"
      ? "View orders, paid downloads, usage records, comments, notifications, and account security settings."
      : "查看订单、付费下载、使用记录、评论、通知与账户安全设置。";

  return (
    <Container className="py-14">
      <div className="mb-8 flex items-center justify-between gap-4">
        <SectionTitle title={t.userCenter.title} intro={userCenterIntro} />
        <form action={logoutAction}>
          <FormSubmitButton variant="secondary" pendingLabel={locale === "en" ? "Logging out..." : "退出中..."}>
            {t.userCenter.logout}
          </FormSubmitButton>
        </form>
      </div>
      {orderMessage ? <p className="status-success mb-6">{orderMessage}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <Panel title={t.notifications.title.replace("{count}", String(unreadNotificationCount))}>
            {notifications.length ? (
              <div className="space-y-3">
                <form action={markAllNotificationsReadAction}>
                  <FormSubmitButton
                    variant="secondary"
                    pendingLabel={locale === "en" ? "Processing..." : "处理中..."}
                    className="px-3 py-1 text-xs"
                  >
                    {t.notifications.markAllRead}
                  </FormSubmitButton>
                </form>
                {notifications.map((notification) => {
                  const display = getNotificationDisplay(notification, locale);

                  return (
                    <div
                      key={notification.id}
                      className={`rounded-xl border p-3 text-sm ${
                        notification.readAt
                          ? "border-white/10 bg-white/5 text-[var(--marketing-muted)]"
                          : "border-[var(--marketing-accent)]/30 bg-[var(--marketing-accent)]/10 text-[var(--marketing-text)]"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{display.title}</p>
                          <p className="mt-1 leading-6 text-[#8B95A7]">{display.content}</p>
                          <p className="mt-2 text-xs text-[#8B95A7]">{formatDateTime(notification.createdAt, locale)}</p>
                        </div>
                        {!notification.readAt ? (
                          <form action={markNotificationReadAction}>
                            <input type="hidden" name="id" value={notification.id} />
                            <FormSubmitButton
                              variant="secondary"
                              pendingLabel={locale === "en" ? "Processing..." : "处理中..."}
                              className="px-2 py-1 text-xs"
                            >
                              {t.notifications.markRead}
                            </FormSubmitButton>
                          </form>
                        ) : null}
                      </div>
                      {notification.linkUrl ? (
                        <Link href={notification.linkUrl} className="mt-3 inline-flex text-xs font-semibold text-[var(--marketing-accent)]">
                          {t.notifications.viewDetails}
                        </Link>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyText>{t.notifications.empty}</EmptyText>
            )}
          </Panel>

          <Panel title={locale === "en" ? "Email notification settings" : "邮件通知设置"}>
            <form action={updateNewsletterSettingsAction} className="grid gap-4">
              <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-[#F6FAFF]">
                <input type="hidden" name="acceptEmailUpdates" value="false" />
                <input
                  name="acceptEmailUpdates"
                  type="checkbox"
                  defaultChecked={user?.acceptEmailUpdates ?? true}
                  value="true"
                  className="h-4 w-4 accent-[var(--marketing-accent)]"
                />
                {locale === "en" ? "I want to receive ENHE AI monthly product digest" : "我愿意接收 ENHE AI 月度产品简报和更新资讯"}
              </label>
              <FormSubmitButton className="text-base" pendingLabel={locale === "en" ? "Saving..." : "保存中..."}>
                {locale === "en" ? "Save settings" : "保存设置"}
              </FormSubmitButton>
            </form>
          </Panel>

          <Panel title={t.userCenter.accountSettings}>
            <p className="text-[#E8EEF8]">{user.email ?? user.phone}</p>
            <p className="mt-2 text-sm text-[#8B95A7]">
              {t.userCenter.role.replace("{role}", user.role === "admin" ? t.userCenter.admin : t.userCenter.user)}
            </p>
            {passwordMessage ? (
              <p className={`mt-4 ${passwordMessage.type === "success" ? "status-success" : "status-danger"}`}>{passwordMessage.text}</p>
            ) : null}
            <form action={changePasswordAction} className="mt-5 grid gap-3">
              <PasswordInput
                name="currentPassword"
                required
                autoComplete="current-password"
                placeholder={t.userCenter.currentPassword}
                showLabel={t.auth.showPassword}
                hideLabel={t.auth.hidePassword}
                className="form-control-dark text-sm"
              />
              <PasswordInput
                name="newPassword"
                minLength={8}
                required
                autoComplete="new-password"
                placeholder={t.userCenter.newPassword}
                showLabel={t.auth.showPassword}
                hideLabel={t.auth.hidePassword}
                className="form-control-dark text-sm"
              />
              <PasswordInput
                name="confirmPassword"
                minLength={8}
                required
                autoComplete="new-password"
                placeholder={t.userCenter.confirmPassword}
                showLabel={t.auth.showPassword}
                hideLabel={t.auth.hidePassword}
                className="form-control-dark text-sm"
              />
              <FormSubmitButton pendingLabel={locale === "en" ? "Saving..." : "保存中..."}>{t.userCenter.changePassword}</FormSubmitButton>
            </form>
          </Panel>
        </aside>

        <div className="space-y-6">
          <Panel title={t.userCenter.orders}>
            <div className="space-y-3">
              {orders.length ? (
                orders.map((order) => (
                  <div key={order.id} className="rounded-xl border border-white/10 bg-white/8 p-4">
                    <div className="flex flex-wrap justify-between gap-3">
                      <span>{order.orderNo}</span>
                      <span className="text-[#FFB86B]">{formatCurrency(order.amount.toString())}</span>
                    </div>
                    <p className="mt-2 text-sm text-[#8B95A7]">
                      {order.plan ? formatLegacyPlanName(locale) : order.tool?.name ?? t.userCenter.orderItem} 路 {formatStatus(order.orderStatus, locale)} 路 {t.userCenter.proof}{" "}
                      {formatStatus(order.paymentProof?.reviewStatus ?? "not_submitted", locale)}
                    </p>
                    {order.orderStatus === "pending_review" || order.paymentProof?.reviewStatus === "pending" ? (
                      <p className="mt-2 text-xs leading-5 text-[#8B95A7]">{getReviewNotice(locale)}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href={`/orders/${order.id}`} className="rounded-full border border-white/12 px-3 py-1 text-xs">
                        {t.userCenter.details}
                      </Link>
                      {["pending_payment", "rejected"].includes(order.orderStatus) ? (
                        <Link href={`/orders/${order.id}/pay`} className="rounded-full bg-[#050505] px-3 py-1 text-xs font-semibold text-white">
                          {t.userCenter.payNow}
                        </Link>
                      ) : null}
                      {canUserCancelOrder(order.orderStatus) ? (
                        <form action={cancelOrderAction}>
                          <input type="hidden" name="orderId" value={order.id} />
                          <FormSubmitButton
                            variant="secondary"
                            pendingLabel={locale === "en" ? "Cancelling..." : "取消中..."}
                            className="px-3 py-1 text-xs"
                          >
                            {t.userCenter.cancelOrder}
                          </FormSubmitButton>
                        </form>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyText>{t.userCenter.noOrders}</EmptyText>
              )}
            </div>
          </Panel>

          <Panel title={t.userCenter.purchasedCourses}>
            <ToolAccessList tools={entitlementSummary.purchasedCourses} emptyText={t.userCenter.noPurchasedCourses} locale={locale} action="details" />
          </Panel>

          <Panel title={t.userCenter.purchasedSoftware}>
            <ToolAccessList tools={entitlementSummary.purchasedSoftware} emptyText={t.userCenter.noPurchasedSoftware} locale={locale} action="details" />
          </Panel>

          <Panel title={t.userCenter.availableOnlineTools}>
            <ToolAccessList tools={entitlementSummary.availableOnlineTools} emptyText={t.userCenter.noAvailableOnlineTools} locale={locale} action="use" />
          </Panel>

          <Panel title={t.userCenter.downloads}>
            {downloads.length ? (
              downloads.map((log) => (
                <p key={log.id} className="border-b border-white/10 py-3 text-sm text-[#8B95A7]">
                  {log.tool.name} 路 {formatDateTime(log.createdAt, locale)}
                </p>
              ))
            ) : (
              <EmptyText>{t.userCenter.noDownloads}</EmptyText>
            )}
          </Panel>

          <Panel title={t.userCenter.usages}>
            {usages.length ? (
              usages.map((log) => (
                <p key={log.id} className="border-b border-white/10 py-3 text-sm text-[#8B95A7]">
                  {log.tool.name} 路 {formatDateTime(log.createdAt, locale)}
                </p>
              ))
            ) : (
              <EmptyText>{t.userCenter.noUsages}</EmptyText>
            )}
          </Panel>

          <Panel title={t.userCenter.comments}>
            {comments.length ? (
              comments.map((comment) => (
                <p key={comment.id} className="border-b border-white/10 py-3 text-sm text-[#8B95A7]">
                  {comment.tool.name} 路 {formatStatus(comment.status, locale)} 路 {comment.content}
                  {comment.status === "pending" ? <span> 路 {getReviewNotice(locale)}</span> : null}
                </p>
              ))
            ) : (
              <EmptyText>{t.userCenter.noComments}</EmptyText>
            )}
          </Panel>
        </div>
      </div>
    </Container>
  );
}

function Panel({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return (
    <section className="surface-panel p-6">
      <h2 className="mb-4 text-xl font-bold text-[var(--marketing-text)]">{title}</h2>
      {children}
    </section>
  );
}

function EmptyText({ children }: React.PropsWithChildren) {
  return <p className="text-sm text-[#8B95A7]">{children}</p>;
}

function ToolAccessList({
  tools,
  emptyText,
  locale,
  action
}: {
  tools: UserEntitlementTool[];
  emptyText: string;
  locale: Locale;
  action: "download" | "use" | "details";
}) {
  const t = getDictionary(locale);
  if (!tools.length) return <EmptyText>{emptyText}</EmptyText>;

  return (
    <div className="divide-y divide-white/10">
      {tools.map((tool) => (
        <div key={tool.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div>
            <Link href={buildCanonicalToolPath(tool, locale)} className="font-semibold text-[var(--marketing-text)] transition hover:text-[var(--marketing-accent)]">
              {tool.name}
            </Link>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#8B95A7]">
              <span className="rounded-full border border-white/10 px-2 py-1">
                {tool.isDownloadPaid ? t.userCenter.paidDownloadAccess : t.userCenter.freeAccess}
              </span>
            </div>
          </div>
          <ToolAccessAction tool={tool} action={action} locale={locale} />
        </div>
      ))}
    </div>
  );
}

function ToolAccessAction({
  tool,
  action,
  locale
}: {
  tool: UserEntitlementTool;
  action: "download" | "use" | "details";
  locale: Locale;
}) {
  const t = getDictionary(locale);
  const className = "surface-panel-soft rounded-full border border-white/12 px-4 py-2 text-xs font-semibold transition hover:border-[var(--marketing-accent)]/60 hover:text-[var(--marketing-accent)]";

  if (action === "download") {
    return <a href={`/api/tools/${tool.id}/download`} className={className}>{t.userCenter.downloadNow}</a>;
  }

  if (action === "use") {
    return <a href={`/api/tools/${tool.id}/use`} className={className}>{t.userCenter.useNow}</a>;
  }

  return <Link href={buildCanonicalToolPath(tool, locale)} className={className}>{t.userCenter.viewTool}</Link>;
}

function getPasswordMessage(value: string | undefined, locale: Locale) {
  if (!value) return null;
  const t = getDictionary(locale);
  if (value === "changed") return { type: "success" as const, text: t.userCenter.passwordChanged };
  return { type: "error" as const, text: locale === "en" ? "Password update failed. Please check your input." : value };
}

function formatStatus(status: string | null | undefined, locale: Locale) {
  if (!status) status = "not_submitted";
  const t = getDictionary(locale);
  return t.userCenter.status[status as keyof typeof t.userCenter.status] ?? status;
}

function formatDateTime(value: Date, locale: Locale) {
  return value.toLocaleString(locale === "en" ? "en-US" : "zh-CN");
}

function formatLegacyPlanName(locale: Locale) {
  return locale === "en" ? "Legacy membership order" : "历史会员订单";
}

function getReviewNotice(locale: Locale) {
  return locale === "en" ? reviewCompletionNoticeEn : reviewCompletionNotice;
}
