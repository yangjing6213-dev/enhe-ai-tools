"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  buildSeoAuditMonitoringOrderCreateData,
  createOrReusePendingSeoAuditOrder,
  loadSeoAuditMonitoringPurchaseSource,
  parseSeoAuditMonitoringPurchaseForm,
} from "@/app/online-tools/seo-geo-audit/purchase";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { requireUser } from "@/lib/auth";
import { assertValidCsrfToken } from "@/lib/csrf";
import { createOrderNo } from "@/lib/order";
import {
  consumeSeoAuditCreditAndEnqueue,
  consumeSeoAuditSubscriptionManualRunAndEnqueue,
} from "@/lib/seo-audit/entitlements";
import { resolveSeoAuditMonitoringOffer } from "@/lib/seo-audit/pricing";
import { updateOwnedSeoAuditSchedule } from "@/lib/seo-audit/schedules";
import { buildLocalePath } from "@/lib/seo";

const localeSchema = z.enum(["zh", "en"]);

function parseLocale(formData: FormData) {
  return localeSchema.catch("zh").parse(formData.get("locale"));
}

export async function purchaseSeoAuditMonitoringAction(formData: FormData) {
  const input = parseSeoAuditMonitoringPurchaseForm(formData);
  await assertValidCsrfToken(input.csrfToken);
  const user = await requireUser(input.locale);
  const offer = await resolveSeoAuditMonitoringOffer();
  const source = await loadSeoAuditMonitoringPurchaseSource({
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    userId: user.id,
  });
  const order = await createOrReusePendingSeoAuditOrder(
    buildSeoAuditMonitoringOrderCreateData({
      orderNo: createOrderNo(),
      userId: user.id,
      source,
      offer,
      paymentMethod: input.paymentMethod,
    }),
  );

  await trackAnalyticsEvent({
    eventName: "seo_audit_checkout_started",
    path: buildLocalePath("/user/seo-audit", input.locale),
    entityType: "order",
    entityId: order.id,
    userId: user.id,
    metadata: {
      offerCode: offer.code,
      sourceType: input.sourceType,
      paymentMethod: input.paymentMethod,
      reusedPendingOrder: order.reused,
    },
  }).catch(() => undefined);

  redirect(`/orders/${order.id}/pay`);
}

export async function startSeoAuditCreditRunAction(formData: FormData) {
  const locale = parseLocale(formData);
  const user = await requireUser(locale);
  const creditId = z.string().min(1).max(128).parse(formData.get("creditId"));
  const kind = z.enum(["professional", "deep"]).parse(formData.get("kind"));
  const targetUrl = z
    .string()
    .min(1)
    .max(2048)
    .parse(formData.get("targetUrl"));
  const result = await consumeSeoAuditCreditAndEnqueue({
    userId: user.id,
    creditId,
    kind,
    targetUrl,
  });

  redirect(
    `${buildLocalePath("/online-tools/seo-geo-audit", locale)}?run=${encodeURIComponent(result.runId)}`,
  );
}

export async function startSeoAuditMonitoringRunAction(formData: FormData) {
  const locale = parseLocale(formData);
  const user = await requireUser(locale);
  const subscriptionId = z
    .string()
    .min(1)
    .max(128)
    .parse(formData.get("subscriptionId"));
  const result = await consumeSeoAuditSubscriptionManualRunAndEnqueue({
    userId: user.id,
    subscriptionId,
  });

  redirect(
    `${buildLocalePath("/online-tools/seo-geo-audit", locale)}?run=${encodeURIComponent(result.runId)}`,
  );
}

export async function updateSeoAuditScheduleAction(formData: FormData) {
  const locale = parseLocale(formData);
  const user = await requireUser(locale);
  const subscriptionId = z
    .string()
    .min(1)
    .max(128)
    .parse(formData.get("subscriptionId"));

  await updateOwnedSeoAuditSchedule({
    userId: user.id,
    subscriptionId,
    schedule: {
      cadence: String(formData.get("cadence") ?? ""),
      weekday: Number(formData.get("weekday")),
      hour: Number(formData.get("hour")),
      minute: Number(formData.get("minute")),
      enabled: formData.get("enabled") === "true",
      notificationEmail: formData.get("notificationEmail"),
    },
  });

  revalidatePath("/user/seo-audit");
  revalidatePath("/en/user/seo-audit");
}
