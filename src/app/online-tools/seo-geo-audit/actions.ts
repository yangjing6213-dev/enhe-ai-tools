"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { assertValidCsrfToken } from "@/lib/csrf";
import { createOrderNo } from "@/lib/order";
import { resolveSeoAuditPaidOffer } from "@/lib/seo-audit/pricing";
import { buildLocalePath } from "@/lib/seo";
import {
  buildSeoAuditOrderCreateData,
  createOrReusePendingSeoAuditOrder,
  loadPurchasableSeoAuditSourceRun,
  parseSeoAuditPurchaseForm,
} from "./purchase";
import { trackSeoAuditProductEvent } from "./events";

const productPath = "/online-tools/seo-geo-audit";

export async function purchaseSeoAuditAction(formData: FormData) {
  const input = parseSeoAuditPurchaseForm(formData);
  await assertValidCsrfToken(input.csrfToken);

  const user = await getCurrentUser();
  if (!user) {
    const returnTo = `${buildLocalePath(productPath, input.locale)}?run=${encodeURIComponent(input.sourceRunId)}`;
    redirect(
      `${buildLocalePath("/login", input.locale)}?returnTo=${encodeURIComponent(returnTo)}`,
    );
  }

  const offer = await resolveSeoAuditPaidOffer(input.offerCode);
  const sourceRun = await loadPurchasableSeoAuditSourceRun({
    runId: input.sourceRunId,
    userId: user.id,
    publicToken: input.publicToken,
  });

  const order = await createOrReusePendingSeoAuditOrder(
    buildSeoAuditOrderCreateData({
      orderNo: createOrderNo(),
      userId: user.id,
      sourceRun,
      offer,
      paymentMethod: input.paymentMethod,
    }),
  );

  await trackSeoAuditProductEvent({
    eventName: "seo_audit_checkout_started",
    path: buildLocalePath(productPath, input.locale),
    entityType: "order",
    entityId: order.id,
    userId: user.id,
    metadata: {
      offerCode: offer.code,
      sourceRunId: sourceRun.id,
      paymentMethod: input.paymentMethod,
      reusedPendingOrder: order.reused,
    },
  }).catch(() => undefined);

  redirect(`/orders/${order.id}/pay`);
}
