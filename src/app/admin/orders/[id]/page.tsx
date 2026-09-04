import Link from "next/link";
import { notFound } from "next/navigation";
import { createRefundRecordAdminAction, deleteOrderAdminAction, processRefundRecordAdminAction, updateOrderAdminAction } from "@/app/admin/actions";
import { AdminSection, Field, inputClass, selectClass, SubmitButton, textareaClass } from "@/app/admin/admin-ui";
import { prisma } from "@/lib/db";
import { adminDeleteRiskConfirmationToken, canAdminDeleteOrderSafely, canRecordRefundForOrder, getRefundRecordActorLabel } from "@/lib/order-rules";
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
      toolPurchase: true,
      refundRecords: { include: { admin: true, requester: true }, orderBy: { createdAt: "desc" } }
    }
  });
  if (!order) notFound();

  const deleteIsSafe = canAdminDeleteOrderSafely(order.orderStatus);

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

      <div className="glass rounded-2xl p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Info label="订单号" value={order.orderNo} />
          <Info label="用户" value={order.user.email ?? order.user.phone ?? order.user.id} />
          <Info label="项目" value={order.plan?.name ?? order.tool?.name ?? "订单项目"} />
          {order.toolPriceSpecName ? <Info label="规格" value={order.toolPriceSpecName} /> : null}
          <Info label="金额" value={formatCurrency(order.amount.toString())} />
          <Info label="订单状态" value={getStatusLabel(orderStatusLabels, order.orderStatus)} />
          <Info label="凭证状态" value={getStatusLabel(proofStatusLabels, order.paymentProof?.reviewStatus)} />
          <Info label="创建时间" value={order.createdAt.toLocaleString("zh-CN")} />
          <Info label="支付时间" value={order.paidAt?.toLocaleString("zh-CN") ?? "-"} />
          <Info label="开通时间" value={order.activatedAt?.toLocaleString("zh-CN") ?? "-"} />
          <Info label="退款日期" value={order.refundRecords[0]?.completedAt?.toLocaleString("zh-CN") ?? "-"} />
          <Info label="订单类型" value={order.orderType === "software_download" ? "软件下载订单" : "历史会员订单"} />
          <Info label="权益记录" value={order.toolPurchase ? "已生成软件购买授权" : order.activatedAt ? "已开通权益" : "未开通"} />
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

      <form action={deleteOrderAdminAction} className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/5 p-5">
        <input type="hidden" name="id" value={order.id} />
        {!deleteIsSafe ? (
          <label className="mb-3 flex gap-3 rounded-xl border border-[#FFB86B]/30 bg-[#FFB86B]/10 px-4 py-3 text-xs leading-6 text-[#FFB86B]">
            <input name="confirmRisk" type="checkbox" required value={adminDeleteRiskConfirmationToken} className="mt-1" />
            <span>该订单已支付、已开通或已退款。删除订单不会自动恢复资金流水，请确认已完成售后处理并承担删除风险。</span>
          </label>
        ) : null}
        <SubmitButton variant="danger" pendingLabel="删除中...">删除订单</SubmitButton>
      </form>
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
