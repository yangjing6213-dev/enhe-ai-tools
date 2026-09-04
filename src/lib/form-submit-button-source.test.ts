import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("form submit feedback", () => {
  it("uses form status to disable submit buttons and show pending feedback", () => {
    const source = readFileSync(join(process.cwd(), "src/components/form-submit-button.tsx"), "utf8");

    expect(source).toContain('"use client"');
    expect(source).toContain("useFormStatus");
    expect(source).toContain("pendingLabel");
    expect(source).toContain("aria-disabled={isDisabled}");
  });

  it("prevents duplicate submit clicks and shows a clear duplicate notice", () => {
    const source = readFileSync(join(process.cwd(), "src/components/form-submit-button.tsx"), "utf8");

    expect(source).toContain("duplicateSubmitLabel");
    expect(source).toContain("已经提交，请勿重复提交");
    expect(source).toContain("event.preventDefault()");
    expect(source).toContain("aria-live=\"polite\"");
    expect(source).toContain("form.dataset.submitted");
  });
});
