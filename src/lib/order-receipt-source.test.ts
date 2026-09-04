import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("order detail user receipt form", () => {
  it("renders an unrestricted user receipt box above after-sales refund controls", () => {
    const source = readFileSync(join(process.cwd(), "src/app/orders/[id]/page.tsx"), "utf8");

    expect(source).toContain("submitOrderReceiptAction");
    expect(source).toContain("用户回执");
    expect(source.indexOf('<h2 className="font-semibold">用户回执')).toBeLessThan(
      source.indexOf('<h2 className="font-semibold">售后/退款')
    );

    const receiptTextarea = source.match(/<textarea[\s\S]*?name="receipt"[\s\S]*?>/);

    expect(receiptTextarea?.[0]).toBeDefined();
    expect(receiptTextarea?.[0]).not.toContain("maxLength");
    expect(receiptTextarea?.[0]).not.toContain("minLength");
    expect(receiptTextarea?.[0]).not.toContain("required");
  });
});
