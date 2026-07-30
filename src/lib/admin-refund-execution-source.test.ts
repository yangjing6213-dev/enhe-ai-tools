import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const actionsSource = readFileSync(
  join(process.cwd(), "src/app/admin/actions.ts"),
  "utf8",
);
const mutationsSource = readFileSync(
  join(process.cwd(), "src/lib/admin-order-mutations.ts"),
  "utf8",
);
const detailPageSource = readFileSync(
  join(process.cwd(), "src/app/admin/refunds/[id]/page.tsx"),
  "utf8",
);
const refundExecutionSource = readFileSync(
  join(process.cwd(), "src/lib/refund-execution.ts"),
  "utf8",
);

describe("admin refund execution source contract", () => {
  it("routes ZPAY refunds through the seven-state executor", () => {
    expect(actionsSource).toContain("executeZpayRefund");
    expect(actionsSource).not.toContain("refundZpayTransactionForOrder");
    expect(actionsSource).not.toContain("requestZpayRefundBeforeCompletion");
    expect(actionsSource).not.toContain("markZpayTransactionRefunded");
  });

  it("prevents order amount edits after a payment transaction exists", () => {
    expect(actionsSource).toContain("updateOrderForAdmin");
    expect(mutationsSource).toContain("assertAdminOrderFinancialUpdateAllowed");
    expect(mutationsSource).toContain("hasPaymentTransaction: Boolean(order.paymentTransaction || order.refundRecords.length)");
  });

  it("creates refund records as pending before any provider execution", () => {
    const createAction = actionsSource.slice(
      actionsSource.indexOf("export async function createRefundRecordAdminAction"),
      actionsSource.indexOf("export async function processRefundRecordAdminAction"),
    );
    const createMutation = mutationsSource.slice(
      mutationsSource.indexOf("export async function createRefundRecordForAdmin"),
      mutationsSource.indexOf("export type PrepareRefundExecutionForAdminInput"),
    );
    expect(createAction).toContain("createRefundRecordForAdmin");
    expect(createMutation).toContain('status: "pending"');
    expect(createAction).toContain("executeZpayRefund");
    expect(createAction).toContain("prepareRefundExecutionForAdmin");
    expect(createAction).toContain('prepared.kind === "zpay"');
    expect(createAction).not.toContain("created.provider");
    expect(createAction).toContain("refund_attempt_exists");
    expect(createMutation).toContain("order.paymentTransaction?.refundRecordId");
    expect(createMutation).toContain("order.paymentTransaction?.refundState");
  });

  it("routes existing refund decisions through locked mutation helpers", () => {
    const processAction = actionsSource.slice(
      actionsSource.indexOf("export async function processRefundRecordAdminAction"),
      actionsSource.indexOf("export async function recoverStaleRefundDispatchAdminAction"),
    );
    expect(processAction).toContain("prepareRefundExecutionForAdmin");
    expect(processAction).toContain("rejectRefundRecordForAdmin");
    expect(processAction).not.toContain("refund.order.paymentTransaction?.provider");
    expect(actionsSource).not.toContain("async function finalizeManualRefundRecord");
    expect(actionsSource).not.toContain("async function rejectPendingRefundRecord");
    expect(processAction).toContain('formData.get("refundConfirmation")');
    expect(processAction).toContain("refundConfirmation");
    expect(detailPageSource).toContain('name="refundConfirmation"');
  });

  it("consumes the one-use gate only after a dispatch claim and before ZPAY", () => {
    const executeSource = refundExecutionSource.slice(
      refundExecutionSource.indexOf("export async function executeZpayRefund"),
      refundExecutionSource.indexOf("export async function resolveAmbiguousZpayRefund"),
    );
    expect(refundExecutionSource).toContain("consumeZpayRefundConfirmation");
    expect(executeSource.indexOf("claimRefundDispatch")).toBeGreaterThan(-1);
    expect(executeSource.indexOf("consumeZpayRefundConfirmation")).toBeGreaterThan(
      executeSource.indexOf('if ("outcome" in claim)'),
    );
    expect(executeSource.indexOf("consumeZpayRefundConfirmation")).toBeLessThan(
      executeSource.indexOf("providerRefund({"),
    );
  });

  it("exposes guarded admin actions for ambiguous resolution and local finalization", () => {
    expect(actionsSource).toContain("export async function recoverStaleRefundDispatchAdminAction");
    expect(actionsSource).toContain("markStaleZpayRefundDispatchesAmbiguous");
    expect(actionsSource).toContain("export async function resolveAmbiguousRefundAdminAction");
    expect(actionsSource).toContain("resolveAmbiguousZpayRefund");
    expect(actionsSource).toContain("export async function retryRefundFinalizationAdminAction");
    expect(actionsSource).toContain("retryZpayRefundFinalization");
  });

  it("requires provider evidence and notifies only for the terminal transition owner", () => {
    const createAction = actionsSource.slice(
      actionsSource.indexOf("export async function createRefundRecordAdminAction"),
      actionsSource.indexOf("export async function processRefundRecordAdminAction"),
    );
    const processAction = actionsSource.slice(
      actionsSource.indexOf("export async function processRefundRecordAdminAction"),
      actionsSource.indexOf("export async function recoverStaleRefundDispatchAdminAction"),
    );
    const resolveAction = actionsSource.slice(
      actionsSource.indexOf("export async function resolveAmbiguousRefundAdminAction"),
      actionsSource.indexOf("export async function retryRefundFinalizationAdminAction"),
    );
    const retryAction = actionsSource.slice(
      actionsSource.indexOf("export async function retryRefundFinalizationAdminAction"),
      actionsSource.indexOf("export async function upsertDevelopmentVersionAction"),
    );

    expect(resolveAction).toContain("providerRefundReference");
    expect(createAction).toContain("result.changed");
    expect(processAction).toContain("if (!result.changed)");
    expect(processAction.indexOf("if (!result.changed)")).toBeLessThan(
      processAction.indexOf("createUserNotification"),
    );
    expect(resolveAction).toContain("if (!result.changed)");
    expect(resolveAction.indexOf("if (!result.changed)")).toBeLessThan(
      resolveAction.indexOf("createUserNotification"),
    );
    expect(retryAction).toContain("if (!result.changed)");
    expect(retryAction.indexOf("if (!result.changed)")).toBeLessThan(
      retryAction.indexOf("createUserNotification"),
    );
    expect(retryAction).not.toContain('formData.get("refundProofImage")');
    expect(retryAction).not.toContain('formData.get("note")');
    expect(detailPageSource).toContain('name="providerRefundReference"');
    const retryForm = detailPageSource.slice(
      detailPageSource.indexOf('reviewMode === "retry_finalization"'),
      detailPageSource.indexOf('reviewMode === "dispatching"'),
    );
    expect(retryForm).not.toContain('name="refundProofImage"');
    expect(retryForm).not.toContain('name="note"');
  });

  it("keeps mutable refund qualifications inside locked services", () => {
    const resolveAction = actionsSource.slice(
      actionsSource.indexOf("export async function resolveAmbiguousRefundAdminAction"),
      actionsSource.indexOf("export async function retryRefundFinalizationAdminAction"),
    );
    const retryAction = actionsSource.slice(
      actionsSource.indexOf("export async function retryRefundFinalizationAdminAction"),
      actionsSource.indexOf("export async function upsertDevelopmentVersionAction"),
    );
    expect(resolveAction).not.toContain("refund.status !== \"pending\"");
    expect(resolveAction).not.toContain("paymentTransaction?.provider");
    expect(resolveAction).not.toContain("paymentTransaction.refundState");
    expect(retryAction).not.toContain("refund.status !== \"pending\"");
    expect(retryAction).not.toContain("paymentTransaction?.provider");
    expect(retryAction).not.toContain("refundState !== \"provider_succeeded\"");
    expect(refundExecutionSource).toContain("REFUND_STATE_MISMATCH");
  });

  it("renders refund controls from the provider refund state", () => {
    expect(detailPageSource).toContain("getRefundAdminReviewMode");
    expect(detailPageSource).toContain("resolveAmbiguousRefundAdminAction");
    expect(detailPageSource).toContain("retryRefundFinalizationAdminAction");
    expect(detailPageSource).toContain("recoverStaleRefundDispatchAdminAction");
    expect(detailPageSource).toContain("zpayRefundDispatchStaleAfterMs");
    expect(detailPageSource).toContain('reviewMode === "resolve_ambiguous"');
    expect(detailPageSource).toContain('reviewMode === "retry_finalization"');
    expect(detailPageSource).toContain('reviewMode === "dispatching"');
  });
});
