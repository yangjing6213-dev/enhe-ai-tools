import Link from "next/link";
import { Container, SectionTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCurrentLocale, type Locale } from "@/lib/i18n";
import { getNotificationDisplay } from "@/lib/notification-display";
import { getNotificationHistoryWhere } from "@/lib/notification-history";
import { buildLocalePath } from "@/lib/seo";

const PAGE_SIZE = 20;

export async function NotificationHistoryPageShell({
  searchParams,
  forceLocale,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
  forceLocale?: Locale;
}) {
  const params = await searchParams;
  const locale = forceLocale ?? (await getCurrentLocale());
  const user = await requireUser(locale);
  const newest = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { id: true },
  });
  const where = getNotificationHistoryWhere(user.id, newest.map(({ id }) => id));
  const total = await prisma.notification.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, pageCount) : 1;
  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  return (
    <Container className="user-center-page py-14">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <SectionTitle
          title={locale === "en" ? "Message history" : "历史消息"}
          intro={locale === "en" ? "Read messages kept outside your three newest notifications." : "这里保存最近 3 条消息以外的已读站内消息。"}
        />
        <Link href={buildLocalePath("/user#notifications", locale)} className="user-center-action user-center-action--primary user-center-action--compact">
          {locale === "en" ? "Back to user center" : "返回用户中心"}
        </Link>
      </div>
      <section className="surface-panel user-center-panel p-6" aria-label={locale === "en" ? "Read message history" : "已读历史消息"}>
        {notifications.length ? (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const display = getNotificationDisplay(notification, locale);
              return (
                <article key={notification.id} className="user-center-record user-center-notification user-center-notification--read rounded-xl border p-4">
                  <h2 className="font-semibold text-[var(--marketing-text)]">{display.title}</h2>
                  <p className="mt-1 leading-6 text-[var(--marketing-muted)]">{display.content}</p>
                  <time dateTime={notification.createdAt.toISOString()} className="mt-2 block text-xs text-[var(--marketing-muted)]">
                    {notification.createdAt.toLocaleString(locale === "en" ? "en-US" : "zh-CN")}
                  </time>
                  {notification.linkUrl ? (
                    <Link href={notification.linkUrl} className="mt-3 inline-flex text-xs font-semibold text-[var(--marketing-accent)]">
                      {locale === "en" ? "View details" : "查看详情"}
                    </Link>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[var(--marketing-muted)]">{locale === "en" ? "No read messages in history." : "暂无历史消息。"}</p>
        )}
        {pageCount > 1 ? (
          <nav className="mt-6 flex items-center justify-between" aria-label={locale === "en" ? "History pages" : "历史消息分页"}>
            {page > 1 ? (
              <Link href={buildLocalePath(`/user/messages?page=${page - 1}`, locale)} className="user-center-action user-center-action--compact">
                {locale === "en" ? "Previous" : "上一页"}
              </Link>
            ) : <span />}
            <span className="text-sm text-[var(--marketing-muted)]">{locale === "en" ? `${page} / ${pageCount}` : `第 ${page} / ${pageCount} 页`}</span>
            {page < pageCount ? (
              <Link href={buildLocalePath(`/user/messages?page=${page + 1}`, locale)} className="user-center-action user-center-action--compact">
                {locale === "en" ? "Next" : "下一页"}
              </Link>
            ) : null}
          </nav>
        ) : null}
      </section>
    </Container>
  );
}
