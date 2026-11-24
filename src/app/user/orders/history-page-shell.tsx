import Link from "next/link";
import { Container, SectionTitle } from "@/components/ui";
import { UserOrderCard } from "@/components/user-order-card";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCurrentLocale, type Locale } from "@/lib/i18n";
import { buildLocalePath } from "@/lib/seo";

const RECENT_ORDER_COUNT = 5;
const PAGE_SIZE = 20;

export async function UserOrderHistoryPageShell({
  searchParams,
  forceLocale,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
  forceLocale?: Locale;
}) {
  const params = await searchParams;
  const locale = forceLocale ?? (await getCurrentLocale());
  const user = await requireUser(locale);
  const where = { userId: user.id };
  const total = await prisma.order.count({ where });
  const historyCount = Math.max(0, total - RECENT_ORDER_COUNT);
  const pageCount = Math.max(1, Math.ceil(historyCount / PAGE_SIZE));
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, pageCount) : 1;
  const orders = historyCount
    ? await prisma.order.findMany({
      where,
      include: { plan: true, tool: true, paymentProof: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE_SIZE,
      skip: RECENT_ORDER_COUNT + (page - 1) * PAGE_SIZE,
    })
    : [];

  const english = locale === "en";
  return (
    <Container className="user-center-page py-14">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <SectionTitle
          title={english ? "Order history" : "历史订单"}
          intro={english ? "Orders older than the five newest orders are listed here." : "这里展示最新 5 个订单以外的历史订单。"}
        />
        <Link href={buildLocalePath("/user#orders", locale)} className="user-center-action user-center-action--primary user-center-action--compact">
          {english ? "Back to user center" : "返回用户中心"}
        </Link>
      </div>
      <section className="surface-panel user-center-panel p-6" aria-label={english ? "Older orders" : "更早的订单"}>
        {orders.length ? (
          <div className="space-y-3">
            {orders.map((order) => <UserOrderCard key={order.id} order={order} locale={locale} />)}
          </div>
        ) : (
          <p className="text-sm text-[var(--marketing-muted)]">{english ? "There are no older orders." : "暂无历史订单。"}</p>
        )}
        {pageCount > 1 ? (
          <nav className="mt-6 flex items-center justify-between" aria-label={english ? "Order history pages" : "历史订单分页"}>
            {page > 1 ? (
              <Link href={buildLocalePath(`/user/orders?page=${page - 1}`, locale)} className="user-center-action user-center-action--compact">
                {english ? "Previous" : "上一页"}
              </Link>
            ) : <span />}
            <span className="text-sm text-[var(--marketing-muted)]">{english ? `${page} / ${pageCount}` : `第 ${page} / ${pageCount} 页`}</span>
            {page < pageCount ? (
              <Link href={buildLocalePath(`/user/orders?page=${page + 1}`, locale)} className="user-center-action user-center-action--compact">
                {english ? "Next" : "下一页"}
              </Link>
            ) : null}
          </nav>
        ) : null}
      </section>
    </Container>
  );
}
