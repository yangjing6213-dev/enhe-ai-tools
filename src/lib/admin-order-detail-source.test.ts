import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("admin order detail page", () => {
  it("surfaces save feedback and pending state for order updates", () => {
    const pageSource = readFileSync(join(process.cwd(), "src/app/admin/orders/[id]/page.tsx"), "utf8");
    const actionSource = readFileSync(join(process.cwd(), "src/app/admin/actions.ts"), "utf8");

    expect(pageSource).toContain("query.saved");
    expect(pageSource).toContain("pendingLabel");
    expect(actionSource).toContain("redirect(`/admin/orders/${id}?saved=1`)");
  });
});
