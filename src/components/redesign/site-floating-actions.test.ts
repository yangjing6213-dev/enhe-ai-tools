import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../../..");

describe("mobile shared floating actions", () => {
  it("keeps orders, inbox, and support under one mobile launcher and avoids headings and filters", () => {
    const source = readFileSync(resolve(root, "src/components/redesign/site-floating-actions.tsx"), "utf8");
    const support = readFileSync(resolve(root, "src/components/customer-support-widget.tsx"), "utf8");
    const styles = readFileSync(resolve(root, "src/styles/redesign/site-refresh.css"), "utf8");
    expect(source).toContain('data-mobile-only="true"');
    expect(source).toContain('window.dispatchEvent(new CustomEvent("enhe:open-support"');
    expect(source).toContain("getSupportLauncherOffset");
    expect(source).toContain("h1, h2, h3");
    expect(source).toContain(".filter-surface input");
    expect(source).toContain(".redesign-footer a");
    expect(source).toContain(".redesign-home-cta");
    expect(support).toContain('window.addEventListener("enhe:open-support"');
    expect(support).toContain("returnFocusTarget");
    expect(styles).toContain(".site-floating-mobile-launcher");
    expect(styles).toContain(".customer-support-widget[data-support-open=\"false\"]");
    expect(styles).toContain(".redesign-mobile-drawer:not([aria-hidden=\"true\"])");
  });
});
