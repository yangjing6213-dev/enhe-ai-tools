import { z } from "zod";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { prisma } from "@/lib/db";

const scheduleSchema = z
  .object({
    cadence: z.enum(["weekly", "biweekly", "monthly"]),
    weekday: z.number().int().min(0).max(6),
    hour: z.number().int().min(0).max(23),
    minute: z.number().int().min(0).max(59),
    enabled: z.boolean(),
    notificationEmail: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? null : value,
      z.string().trim().email().max(320).nullable(),
    ),
  })
  .strict();

export type SeoAuditScheduleInput = z.infer<typeof scheduleSchema>;

export function parseSeoAuditScheduleInput(input: unknown) {
  const parsed = scheduleSchema.safeParse(input);
  if (!parsed.success) throw new Error("INVALID_SCHEDULE");
  return parsed.data;
}

export function resolveNextSeoAuditScheduleAt(
  input: Pick<
    SeoAuditScheduleInput,
    "cadence" | "weekday" | "hour" | "minute" | "enabled"
  >,
  now: Date,
) {
  if (!input.enabled) return null;
  const shanghaiOffsetMs = 8 * 60 * 60 * 1000;
  const localNow = new Date(now.getTime() + shanghaiOffsetMs);
  const daysUntil = (input.weekday - localNow.getUTCDay() + 7) % 7;
  const localCandidate = new Date(
    Date.UTC(
      localNow.getUTCFullYear(),
      localNow.getUTCMonth(),
      localNow.getUTCDate() + daysUntil,
      input.hour,
      input.minute,
    ),
  );
  let next = new Date(localCandidate.getTime() - shanghaiOffsetMs);
  if (next <= now) next = new Date(next.getTime() + 7 * 24 * 60 * 60 * 1000);
  return next;
}

export async function updateOwnedSeoAuditSchedule(
  input: {
    userId: string;
    subscriptionId: string;
    schedule: unknown;
  },
  options: {
    db?: typeof prisma;
    now?: Date;
    trackEvent?: typeof trackAnalyticsEvent;
  } = {},
) {
  const db = options.db ?? prisma;
  const trackEvent = options.trackEvent ?? trackAnalyticsEvent;
  const now = options.now ? new Date(options.now) : new Date();
  const schedule = parseSeoAuditScheduleInput(input.schedule);
  const nextRunAt = resolveNextSeoAuditScheduleAt(schedule, now);

  const result = await db.$transaction(async (tx) => {
    const subscription = await tx.seoAuditSubscription.findFirst({
      where: {
        id: input.subscriptionId,
        userId: input.userId,
        status: { in: ["active", "paused"] },
        expiresAt: { gt: now },
      },
      select: { id: true, schedule: { select: { enabled: true } } },
    });
    if (!subscription) throw new Error("SCHEDULE_UNAVAILABLE");

    const saved = await tx.seoAuditSchedule.update({
      where: { subscriptionId: subscription.id },
      data: {
        cadence: schedule.cadence,
        weekday: schedule.weekday,
        hour: schedule.hour,
        minute: schedule.minute,
        timeZone: "Asia/Shanghai",
        enabled: schedule.enabled,
        notificationEmail: schedule.notificationEmail,
        nextRunAt,
      },
      select: { id: true },
    });
    await tx.seoAuditSubscription.update({
      where: { id: subscription.id },
      data: { status: schedule.enabled ? "active" : "paused" },
      select: { id: true },
    });
    return {
      scheduleId: saved.id,
      enabledChanged: subscription.schedule?.enabled !== schedule.enabled,
    };
  });

  if (result.enabledChanged) {
    try {
      await trackEvent({
        eventName: schedule.enabled
          ? "seo_audit_schedule_enabled"
          : "seo_audit_schedule_paused",
        entityType: "seo_audit_subscription",
        entityId: input.subscriptionId,
        userId: input.userId,
        metadata: { cadence: schedule.cadence },
      });
    } catch (error) {
      console.error("[seo-audit] failed to track schedule state change", error);
    }
  }

  return { scheduleId: result.scheduleId };
}
