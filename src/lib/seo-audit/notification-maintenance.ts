import {
  deliverPendingSeoAuditEmails,
  notifySeoAuditPendingCompletions,
  notifySeoAuditPendingFinalFailures,
  notifySeoAuditSubscriptionExpirations,
} from "@/lib/email-seo-audit-notifications";

type MaintenanceTask =
  | "pendingCompletions"
  | "pendingFinalFailures"
  | "subscriptionExpirations"
  | "emailOutbox";

type NotificationMaintenanceDependencies = {
  notifyPendingCompletions?: (options: {
    deferEmailDelivery: true;
  }) => Promise<unknown>;
  notifyPendingFinalFailures?: (options: {
    deferEmailDelivery: true;
  }) => Promise<unknown>;
  notifySubscriptionExpirations?: (options: {
    deferEmailDelivery: true;
  }) => Promise<unknown>;
  deliverPendingEmails?: (options: { limit: 1 }) => Promise<unknown>;
  reportError?: (task: MaintenanceTask, error: unknown) => void;
};

export async function runSeoAuditNotificationMaintenance(
  dependencies: NotificationMaintenanceDependencies = {},
) {
  const pendingCompletions =
    dependencies.notifyPendingCompletions ?? notifySeoAuditPendingCompletions;
  const pendingFinalFailures =
    dependencies.notifyPendingFinalFailures ??
    notifySeoAuditPendingFinalFailures;
  const subscriptionExpirations =
    dependencies.notifySubscriptionExpirations ??
    notifySeoAuditSubscriptionExpirations;
  const deferredDelivery = { deferEmailDelivery: true } as const;
  const [completionResult, pendingResult, expirationResult] =
    await Promise.allSettled([
      Promise.resolve().then(() => pendingCompletions(deferredDelivery)),
      Promise.resolve().then(() => pendingFinalFailures(deferredDelivery)),
      Promise.resolve().then(() => subscriptionExpirations(deferredDelivery)),
    ]);

  reportFailure(
    "pendingCompletions",
    completionResult,
    dependencies.reportError,
  );
  reportFailure(
    "pendingFinalFailures",
    pendingResult,
    dependencies.reportError,
  );
  reportFailure(
    "subscriptionExpirations",
    expirationResult,
    dependencies.reportError,
  );
  const deliverPendingEmails =
    dependencies.deliverPendingEmails ?? deliverPendingSeoAuditEmails;
  const [emailOutboxResult] = await Promise.allSettled([
    Promise.resolve().then(() => deliverPendingEmails({ limit: 1 })),
  ]);
  reportFailure("emailOutbox", emailOutboxResult, dependencies.reportError);

  return {
    pendingCompletions:
      completionResult.status === "fulfilled" ? "completed" : "failed",
    pendingFinalFailures:
      pendingResult.status === "fulfilled" ? "completed" : "failed",
    subscriptionExpirations:
      expirationResult.status === "fulfilled" ? "completed" : "failed",
    emailOutbox:
      emailOutboxResult.status === "fulfilled" ? "completed" : "failed",
  } as const;
}

function reportFailure(
  task: MaintenanceTask,
  result: PromiseSettledResult<unknown>,
  reportError: NotificationMaintenanceDependencies["reportError"],
) {
  if (result.status === "fulfilled") return;
  if (reportError) {
    reportError(task, result.reason);
    return;
  }
  console.error(
    "[seo-audit-notifications] maintenance task failed",
    { task },
    result.reason,
  );
}
