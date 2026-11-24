import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { cancelOrderAction } from "@/app/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { canUserCancelOrder } from "@/lib/order-rules";
import { getDictionary, type Locale } from "@/lib/i18n";
import { reviewCompletionNotice, reviewCompletionNoticeEn } from "@/lib/review-copy";
import { formatCurrency } from "@/lib/utils";

export type UserOrder = Prisma.OrderGetPayload<{
  include: { plan: true; tool: true; paymentProof: true };
}>;

export function UserOrderCard({ order, locale }: { order: UserOrder; locale: Locale }) {
  const t = getDictionary(locale);

  return (
    <article className="user-center-record user-center-order rounded-xl border p-4">
      <div className="flex flex-wrap justify-between gap-3">
        <span className="break-all font-semibold">{order.orderNo}</span>
        <span className="font-semibold text-[var(--enhe-action)]">{formatCurrency(order.amount.toString())}</span>
      </div>
      <p className="mt-2 text-sm text-[var(--marketing-muted)]">
        {order.plan ? formatLegacyPlanName(locale) : order.tool?.name ?? t.userCenter.orderItem}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="user-center-badge rounded-full border px-2 py-1">{formatStatus(order.orderStatus, locale)}</span>
        <time dateTime={order.createdAt.toISOString()} className="text-xs text-[var(--marketing-muted)]">{formatDateTime(order.createdAt, locale)}</time>
      </div>
      {order.paymentProof ? <p className="mt-2 text-sm text-[var(--marketing-muted)]">{t.userCenter.proof} {formatStatus(order.paymentProof.reviewStatus, locale)}</p> : null}
      {order.orderStatus === "pending_review" || order.paymentProof?.reviewStatus === "pending" ? (
        <p className="mt-2 text-xs leading-5 text-[var(--marketing-muted)]">{getReviewNotice(locale)}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={`/orders/${order.id}`} className="user-center-action user-center-action--compact px-3 py-1 text-xs">
          {t.userCenter.details}
        </Link>
        {["pending_payment", "rejected"].includes(order.orderStatus) ? (
          <Link href={`/orders/${order.id}/pay`} className="user-center-action user-center-action--primary user-center-action--compact px-3 py-1 text-xs font-semibold">
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
    </article>
  );
}

function formatStatus(status: string | null | undefined, locale: Locale) {
  const resolved = status || "not_submitted";
  const t = getDictionary(locale);
  return t.userCenter.status[resolved as keyof typeof t.userCenter.status] ?? resolved;
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
