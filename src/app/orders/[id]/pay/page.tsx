import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Container, SectionTitle } from "@/components/ui";
import { PaymentQrCode } from "@/components/payment-qr-code";
import { ZpayPaymentStatusPoller } from "@/components/zpay-payment-status-poller";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { expireUnpaidOrder } from "@/lib/order-expiry";
import { isOrderPaymentExpired } from "@/lib/order-payment-deadline";
import { getOrderPaymentPresentation } from "@/lib/order-payment-presentation";
import { buildCanonicalToolPath } from "@/lib/public-slugs";
import { formatCurrency } from "@/lib/utils";
import { getLocalizedStatusLabel } from "@/lib/status-labels";
import { getZpayPaymentErrorCopy } from "@/lib/zpay-payment-copy";
import { ensureZpayPaymentForOrder, type ZpayPaymentView } from "@/lib/zpay-orders";

type PayPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PayPage({ params }: PayPageProps) {
  const user = await requireUser();
  const { id } = await params;
  const requestHeaders = await headers();
  const clientIp =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip")?.trim() ||
    "127.0.0.1";
  const order = await prisma.order.findFirst({
    where: { id, userId: user.id },
    include: {
      plan: true,
      tool: true,
      seoAuditOffer: true,
      toolPurchase: true,
      seoAuditCredit: true,
      seoAuditSubscriptionOrder: true,
      paymentTransaction: true,
    }
  });
  if (!order) notFound();

  if (order.orderStatus === "pending_payment" && isOrderPaymentExpired(order.createdAt)) {
    await expireUnpaidOrder(order.id);
    const current = await prisma.order.findUnique({ where: { id: order.id }, select: { orderStatus: true, paymentTransaction: true } });
    if (current) Object.assign(order, current);
  }

  let zpayPayment: ZpayPaymentView | null = null;
  let zpayError: string | null = null;
  const presentation = getOrderPaymentPresentation({
    orderType: order.orderType,
    orderStatus: order.orderStatus,
    hasToolPurchase: Boolean(order.toolPurchase),
    hasSeoAuditCredit: Boolean(order.seoAuditCredit),
    hasSeoAuditSubscriptionOrder: Boolean(order.seoAuditSubscriptionOrder),
  });
  const isTerminalUnpayable = order.orderStatus === "cancelled" || order.orderStatus === "refunded";

  if (order.orderStatus === "cancelled") {
    zpayError = order.paymentTransaction?.status === "paid"
      ? "ZPAY_PAYMENT_AFTER_CANCEL_RECONCILIATION"
      : "ZPAY_ORDER_CANCELLED";
  }

  if (presentation.isZpayPayable && !presentation.isUnlocked && !isTerminalUnpayable) {
    try {
      zpayPayment = await ensureZpayPaymentForOrder({ orderId: order.id, userId: user.id, clientIp });
    } catch (error) {
      zpayError = error instanceof Error ? error.message : "支付订单创建失败。";
    }
  } else if (order.paymentTransaction && !isTerminalUnpayable) {
    zpayPayment = {
      transaction: order.paymentTransaction,
      displayUrl: order.paymentTransaction.qrImageUrl ?? order.paymentTransaction.qrCodeUrl ?? order.paymentTransaction.payUrl ?? order.paymentTransaction.payUrl2,
      displayImageUrl: order.paymentTransaction.qrImageUrl,
      payUrl: order.paymentTransaction.payUrl ?? order.paymentTransaction.payUrl2,
      qrcodeUrl: order.paymentTransaction.qrCodeUrl
    };
  }
  const paymentErrorCopy = zpayError ? getZpayPaymentErrorCopy(zpayError, order.orderNo) : null;

  const isWechatPayment = zpayPayment
    ? zpayPayment.transaction.paymentType === "wxpay"
    : order.paymentMethod === "wechat";
  const paymentChannelCopy = isWechatPayment
    ? {
        methodLabel: "微信支付",
        guide: "请使用微信扫码完成支付，付款后页面会自动更新。",
        checkoutLabel: "打开收银台"
      }
    : {
        methodLabel: "支付宝",
        guide: "请使用支付宝扫码或打开收银台完成支付，付款后页面会自动更新。",
        checkoutLabel: "打开支付宝收银台"
      };

  return (
    <Container className="py-14">
      <SectionTitle
        title="订单支付"
        intro={
          paymentErrorCopy
            ? "请根据下方提示处理当前订单。"
            : `请使用当前订单二维码完成支付。${presentation.paymentCompletionText}`
        }
      />

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="surface-panel !border-slate-200 !bg-white !bg-none p-7 text-slate-900">
          <p className="text-sm text-slate-600">订单号</p>
          <h1 className="mt-2 break-all text-2xl font-black text-[var(--marketing-accent)]">{order.orderNo}</h1>

          <div className="mt-7 grid gap-4">
            <Info label="项目" value={order.tool?.name ?? order.seoAuditOffer?.name ?? order.plan?.name ?? "订单项目"} />
            {order.toolPriceSpecName ? <Info label="规格" value={order.toolPriceSpecName} /> : null}
            <Info label="类型" value={presentation.typeLabel} />
            <Info label="金额" value={formatCurrency(order.amount.toString())} />
            <Info label="订单状态" value={getLocalizedStatusLabel("order", order.orderStatus, "zh")} />
            <Info label="支付方式" value={paymentChannelCopy.methodLabel} />
          </div>
        </div>

        <div className="surface-panel !border-slate-200 !bg-white !bg-none p-7 text-slate-900">
          {presentation.isUnlocked ? (
            <div>
              <h2 className="text-xl font-bold text-[var(--marketing-accent)]">{presentation.unlockedTitle}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {presentation.unlockedDescription}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {order.tool ? (
                  <Link href={`${buildCanonicalToolPath(order.tool, "zh")}#download-links`} className="rounded-full bg-[#050505] px-5 py-3 text-sm font-semibold text-white">
                    查看下载链接
                  </Link>
                ) : null}
                <Link href={`/orders/${order.id}`} className="rounded-full border border-white/12 px-5 py-3 text-sm">
                  查看订单详情
                </Link>
              </div>
            </div>
          ) : paymentErrorCopy ? (
            <div>
              <h2 className="text-xl font-bold text-[var(--marketing-accent)]">
                {paymentErrorCopy.title}
              </h2>
              <p className="mt-3 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-900">
                {paymentErrorCopy.description}
              </p>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                {paymentErrorCopy.nextStep}
              </p>
            </div>
          ) : zpayPayment ? (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">扫码支付</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    二维码为当前订单动态生成，请确认金额与订单号无误后支付。
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-[280px_1fr]">
                <div className="rounded-2xl border border-white/10 bg-white p-4">
                  {zpayPayment.displayImageUrl ? (
                    <Image
                      src={zpayPayment.displayImageUrl}
                      alt="动态支付二维码"
                      width={280}
                      height={280}
                      className="aspect-square w-full rounded-xl object-contain"
                      unoptimized
                    />
                  ) : zpayPayment.qrcodeUrl ? (
                    <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-slate-100 p-4 text-center text-sm text-slate-900">
                      <PaymentQrCode
                        value={zpayPayment.qrcodeUrl}
                        label={`${paymentChannelCopy.methodLabel}支付二维码`}
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-900">
                      暂无二维码图片
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-between gap-5">
                  <div className="space-y-3 text-sm leading-6 text-slate-600">
                    <p>请在下单后 10 分钟内付款，超时未付款订单将自动取消。</p>
                    <p>{presentation.paymentCompletionText}</p>
                    <p>{paymentChannelCopy.guide}</p>
                    {zpayPayment.transaction.providerTradeNo ? (
                      <p className="break-all">支付订单号：{zpayPayment.transaction.providerTradeNo}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {zpayPayment.transaction.paymentType !== "wxpay" && (zpayPayment.payUrl ?? zpayPayment.qrcodeUrl ?? zpayPayment.displayUrl) ? (
                      <a
                        href={zpayPayment.payUrl ?? zpayPayment.qrcodeUrl ?? zpayPayment.displayUrl ?? "#"}
                        target="_blank"
                        rel="nofollow noopener noreferrer"
                        className="rounded-full bg-[#050505] px-5 py-3 text-sm font-semibold text-white"
                      >
                        {paymentChannelCopy.checkoutLabel}
                      </a>
                    ) : null}
                    <Link href={`/orders/${order.id}`} className="rounded-full border border-white/12 px-5 py-3 text-sm">
                      查看订单详情
                    </Link>
                  </div>
                </div>
              </div>

              <ZpayPaymentStatusPoller
                orderId={order.id}
                toolHref={order.tool ? `${buildCanonicalToolPath(order.tool, "zh")}#download-links` : null}
              />
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-bold text-[var(--marketing-accent)]">当前订单暂不可支付</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                该订单状态为 {order.orderStatus}，请返回订单详情查看。
              </p>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-600">{label}</p>
      <p className="mt-2 break-all font-semibold text-slate-900">{value}</p>
    </div>
  );
}
