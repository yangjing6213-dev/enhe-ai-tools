import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("admin payment review pages", () => {
  it("keeps the payment review action button centered and on one line", () => {
    const source = readFileSync(join(process.cwd(), "src/app/admin/payments/page.tsx"), "utf8");

    expect(source).toContain("grid-cols-[1.15fr_1fr_0.9fr_0.65fr_0.7fr_0.8fr_0.75fr]");
    expect(source).toContain("inline-flex whitespace-nowrap");
  });

  it("shows explicit feedback after payment approval or rejection", () => {
    const detailSource = readFileSync(join(process.cwd(), "src/app/admin/payments/[id]/page.tsx"), "utf8");
    const actionSource = readFileSync(join(process.cwd(), "src/app/actions.ts"), "utf8");

    expect(detailSource).toContain("searchParams");
    expect(detailSource).toContain("reviewNotice");
    expect(detailSource).toContain("reviewedApproved");
    expect(detailSource).toContain("reviewedRejected");
    expect(actionSource).toContain("redirect(`/admin/payments/${proof.id}?review=${decision}`)");
  });

  it("uses pending-state submit buttons for payment review actions", () => {
    const detailSource = readFileSync(join(process.cwd(), "src/app/admin/payments/[id]/page.tsx"), "utf8");

    expect(detailSource).toContain("SubmitButton");
    expect(detailSource).toContain("approving");
    expect(detailSource).toContain("rejecting");
  });
});
