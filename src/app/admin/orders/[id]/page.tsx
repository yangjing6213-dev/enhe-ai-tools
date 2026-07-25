import Link from "next/link";
import { notFound } from "next/navigation";
import { createRefundRecordAdminAction, deleteOrderAdminAction, processRefundRecordAdminAction, updateOrderAdminAction } from "@/app/admin/actions";
import { AdminSection, Field, inputClass, selectClass, SubmitButton, textareaClass } from "@/app/admin/admin-ui";
import { decideAdminOrderHardDelete } from "@/lib/admin-delete-protection";
import { prisma } from "@/lib/db";
import { canRecordRefundForOrder, getRefundRecordActorLabel } from "@/lib/order-rules";
import { getStatusLabel, orderStatusLabels, proofStatusLabels, refundStatusLabels } from "@/lib/status-labels";
import { formatCurrency } from "@/lib/utils";

const orderStatusOptions = [
  ["pending_payment", "待支付"],
  ["pending_review", "待审核"],
  ["paid", "已支付"],
  ["rejected", "审核失败"],
  ["cancelled", "已取消"],
  ["refunded", "已退款"]
] as const;

type AdminOrderDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function AdminOrderDetailPage({ params, searchParams }: AdminOrderDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: true,
      plan: true,
      tool: true,
      paymentProof: true,
      paymentTransaction: true,
      toolPurchase: true,
      seoAuditCredit: true,
      seoAuditSubscriptionOrder: true,
      seoAuditOffer: true,
      _count: { select: { refundRecords: true, seoAuditRuns: true } },
      refundRecords: { include: { admin: true, requester: true }, orderBy: { createdAt: "desc" } }
    }
  });
  if (!order) notFound();

  const protectedCounts = {
    paymentTransaction: order.paymentTransaction ? 1 : 0,
    paymentProof: order.paymentProof ? 1 : 0,
    refundRecords: order._count.refundRecords,
    toolPurchase: order.toolPurchase ? 1 : 0,
    seoAuditCredit: order.seoAuditCredit ? 1 : 0,
    seoAuditSubscriptionOrder: order.seoAuditSubscriptionOrder ? 1 : 0,
    seoAuditRuns: order._count.seoAuditRuns
  };
  const deleteDecision = decideAdminOrderHardDelete({
    orderStatus: order.orderStatus,
    isTestData: order.isTestData,
    protectedCounts
  });

  return (
    <AdminSection title="订单详情" intro="在单独详情页处理订单状态、付款记录、售后退款和删除风险确认。">
      <div className="mb-6 flex flex-wrap gap-3">
        <Link href="/admin/orders" className="rounded-full border border-white/15 px-4 py-2 text-sm transition hover:border-[#48F5D3]/50 hover:text-[#48F5D3]">
          返回订单清单
        </Link>
        {order.paymentProof ? (
          <Link href={`/admin/payments/${order.paymentProof.id}`} className="rounded-full border border-[#48F5D3]/30 px-4 py-2 text-sm text-[#48F5D3]">
            查看付款记录
          </Link>
        ) : null}
      </div>

      {query.refund ? (
        <p className="mb-5 rounded-xl border border-[#48F5D3]/30 bg-[#48F5D3]/10 px-4 py-3 text-sm text-[#48F5D3]">售后/退款记录已保存。</p>
      ) : null}

      {query.saved ? (
        <p className="mb-5 rounded-xl border border-[#48F5D3]/30 bg-[#48F5D3]/10 px-4 py-3 text-sm font-semibold text-[#48F5D3]">订单已保存。</p>
      ) : null}

      {query.error ? (
        <p className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          操作失败：{query.error}
        </p>
      ) : null}

      <div className="glass rounded-2xl p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Info label="订单号" value={order.orderNo} />
          <Info label="用户" value={order.user.email ?? order.user.phone ?? order.user.id} />
          <Info label="项目" value={order.seoAuditOffer?.name ?? order.plan?.name ?? order.tool?.name ?? "订单项目"} />
          {order.toolPriceSpecName ? <Info label="规格" value={order.toolPriceSpecName} /> : null}
          <Info label="金额" value={formatCurrency(order.amount.toString())} />
          <Info label="订单状态" value={getStatusLabel(orderStatusLabels, order.orderStatus)} />
          <Info label="数据标识" value={order.isTestData ? "测试数据" : "生产数据（不可硬删除）"} />
          <Info label="凭证状态" value={getStatusLabel(proofStatusLabels, order.paymentProof?.reviewStatus)} />
          <Info label="创建时间" value={order.createdAt.toLocaleString("zh-CN")} />
          <Info label="支付时间" value={order.paidAt?.toLocaleString("zh-CN") ?? "-"} />
          <Info label="开通时间" value={order.activatedAt?.toLocaleString("zh-CN") ?? "-"} />
          <Info label="退款日期" value={order.refundRecords[0]?.completedAt?.toLocaleString("zh-CN") ?? "-"} />
          <Info label="订单类型" value={orderTypeLabel(order.orderType)} />
          {order.seoAuditTargetOrigin ? <Info label="巡检站点" value={order.seoAuditTargetOrigin} /> : null}
          <Info label="权益记录" value={entitlementLabel(order)} />
          <Info label="受保护记录" value={formatProtectedCounts(protectedCounts)} />
        </div>

        <form action={updateOrderAdminAction} className="mt-6 grid gap-4 border-t border-white/10 pt-6 md:grid-cols-[180px_160px_160px_1fr]">
          <input type="hidden" name="id" value={order.id} />
          <Field label="订单状态">
            <select name="orderStatus" defaultValue={order.orderStatus} className={selectClass}>
              {order.orderStatus === "activated" ? <option value="activated">已开通（不可手动设置）</option> : null}
              {orderStatusOptions.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="订单金额">
            <input name="amount" type="number" step="0.01" min="0" defaultValue={order.amount.toString()} className={inputClass} />
          </Field>
          <Field label="支付方式">
            <select name="paymentMethod" defaultValue={order.paymentMethod ?? ""} className={selectClass}>
              <option value="">未选择</option>
              <option value="alipay">支付宝</option>
              <option value="wechat">微信</option>
            </select>
          </Field>
          <div className="flex items-end gap-3">
            <SubmitButton pendingLabel="保存中...">保存订单</SubmitButton>
            <p className="pb-3 text-xs leading-5 text-[#8B95A7]">如需开通软件权益，请到支付审核中通过对应付款凭证。</p>
          </div>
        </form>
      </div>

      <div className="glass mt-6 rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">售后/退款记录</h2>
          <span className="text-xs text-[#8B95A7]">用户申请退款需提交收款码；确认退款后会同步撤销该订单的软件授权。</span>
        </div>

        <div className="mt-4 space-y-3">
          {order.refundRecords.map((refund) => (
            <div key={refund.id} className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-[#8B95A7]">
              <p>
                <span className="font-semibold text-[#E8EEF8]">{formatCurrency(refund.amount.toString())}</span>
                <span> · {getStatusLabel(refundStatusLabels, refund.status)} · {refund.reason}</span>
                <span> · {getRefundRecordActorLabel({ adminEmail: refund.admin?.email, requesterEmail: refund.requester?.email })}</span>
                <span> · 退款日期：{refund.completedAt?.toLocaleString("zh-CN") ?? "-"}</span>
              </p>
              {refund.refundReceiverQr ? (
                <p className="mt-2 break-all text-xs text-[#48F5D3]">用户收款码/收款信息：{refund.refundReceiverQr}</p>
              ) : null}
              {refund.refundProofImage ? (
                <p className="mt-2 break-all text-xs text-[#7AA7FF]">退款凭证：{refund.refundProofImage}</p>
              ) : null}
              {refund.note ? <p className="mt-2 text-xs leading-5">{refund.note}</p> : null}
              <Link href={`/admin/refunds/${refund.id}`} className="mt-3 inline-flex rounded-full border border-white/15 px-4 py-2 text-xs font-semibold transition hover:border-[#48F5D3]/50 hover:text-[#48F5D3]">
                查看退款详情
              </Link>
              {refund.status === "pending" ? (
                <form action={processRefundRecordAdminAction} className="mt-3 grid gap-2 md:grid-cols-[1fr_120px_120px]">
                  <input type="hidden" name="refundId" value={refund.id} />
                  <input name="note" placeholder="处理备注" className={inputClass} />
                  <SubmitButton name="status" value="completed" variant="success" pendingLabel="处理中..." className="px-4 py-2 text-xs">确认退款</SubmitButton>
                  <SubmitButton name="status" value="rejected" variant="secondary" pendingLabel="处理中..." className="px-4 py-2 text-xs">拒绝申请</SubmitButton>
                </form>
              ) : null}
            </div>
          ))}
          {order.refundRecords.length === 0 ? <p className="text-sm text-[#8B95A7]">暂无售后/退款记录。</p> : null}
        </div>

        {canRecordRefundForOrder(order.orderStatus) ? (
          <form action={createRefundRecordAdminAction} className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-[160px_160px_1fr]">
            <input type="hidden" name="orderId" value={order.id} />
            <Field label="退款金额">
              <input name="amount" required type="number" step="0.01" min="0.01" max={order.amount.toString()} defaultValue={order.amount.toString()} className={inputClass} />
            </Field>
            <Field label="处理状态">
              <select name="status" defaultValue="completed" className={selectClass}>
                <option value="completed">已退款</option>
                <option value="pending">处理中</option>
                <option value="rejected">不退款</option>
              </select>
            </Field>
            <Field label="原因">
              <input name="reason" required minLength={2} placeholder="例如：用户申请退款 / 重复付款 / 售后补偿" className={inputClass} />
            </Field>
            <Field label="用户收款码/收款信息" className="md:col-span-3">
              <input name="refundReceiverQr" placeholder="可填写收款码图片 URL、线下已核验说明或转账收款信息" className={inputClass} />
            </Field>
            <Field label="退款凭证 URL" className="md:col-span-3">
              <input name="refundProofImage" placeholder="可填写退款截图、转账回执或退款流水截图 URL" className={inputClass} />
            </Field>
            <Field label="备注" className="md:col-span-3">
              <textarea name="note" placeholder="可填写沟通记录、退款流水号、处理说明" className={textareaClass} />
            </Field>
            <div className="md:col-span-3">
              <SubmitButton>保存售后/退款记录</SubmitButton>
            </div>
          </form>
        ) : (
          <p className="mt-4 text-xs text-[#8B95A7]">当前订单状态不允许创建退款记录。</p>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/5 p-5">
        {deleteDecision.allowed ? (
          <form action={deleteOrderAdminAction}>
            <input type="hidden" name="id" value={order.id} />
            <p className="mb-3 text-xs leading-6 text-red-100/80">仅无任何业务关系的已取消测试订单允许硬删除。</p>
            <SubmitButton variant="danger" pendingLabel="删除中...">删除订单</SubmitButton>
          </form>
        ) : (
          <p className="text-sm leading-6 text-red-100">
            该订单不可硬删除（{deleteDecision.code}）。支付、退款、权益和巡检报告证据会永久保留。
          </p>
        )}
      </div>
    </AdminSection>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs text-[#8B95A7]">{label}</p>
      <p className="mt-2 break-all font-semibold text-[#E8EEF8]">{value}</p>
    </div>
  );
}

function orderTypeLabel(orderType: string) {
  if (orderType === "software_download") return "软件/服务订单";
  if (orderType === "seo_audit_credit") return "SEO/GEO 巡检次数包";
  if (orderType === "seo_audit_monitoring") return "SEO/GEO 持续监控";
  return "会员订单";
}

function entitlementLabel(order: {
  toolPurchase: unknown;
  seoAuditCredit: unknown;
  seoAuditSubscriptionOrder: unknown;
  activatedAt: Date | null;
}) {
  if (order.seoAuditCredit) return "已生成巡检次数权益";
  if (order.seoAuditSubscriptionOrder) return "已绑定监控服务期";
  if (order.toolPurchase) return "已生成软件购买授权";
  return order.activatedAt ? "已开通权益" : "未开通";
}

function formatProtectedCounts(counts: Record<string, number>) {
  const labels: Record<string, string> = {
    paymentTransaction: "支付流水",
    paymentProof: "支付凭证",
    refundRecords: "退款记录",
    toolPurchase: "购买权益",
    seoAuditCredit: "巡检次数",
    seoAuditSubscriptionOrder: "监控续费",
    seoAuditRuns: "巡检任务/报告"
  };
  const values = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => `${labels[key] ?? key} ${count}`);
  return values.length ? values.join(" · ") : "无";
}
