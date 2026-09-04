import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("global night glass UI source contract", () => {
  it("shares the approved ENHE night glass tokens and utility surfaces", () => {
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

    expect(css).toContain("--marketing-bg: #22242a");
    expect(css).toContain("--marketing-accent: #f05a35");
    expect(css).toContain("--font-sans: 'Montserrat', 'Microsoft YaHei', 'Microsoft YaHei UI'");
    expect(css).toContain("--font-heading-zh: 'Montserrat', 'Microsoft YaHei', 'Microsoft YaHei UI'");
    expect(css).toContain(".surface-panel");
    expect(css).toContain(".surface-panel-soft");
    expect(css).toContain(".filter-surface");
    expect(css).toContain(".admin-shell-card");
    expect(css).toContain(".admin-nav-link");
    expect(css).toContain(".form-control-dark");
    expect(css).toContain(".form-select-dark");
    expect(css).toContain(".status-success");
    expect(css).toContain(".status-warning");
    expect(css).toContain(".status-danger");
    expect(css).toContain("backdrop-filter: blur(28px) saturate(160%)");
    expect(css).toContain("-webkit-backdrop-filter: blur(28px) saturate(160%)");
  });

  it("updates shared public components away from the old cyan primary language", () => {
    const ui = readFileSync(new URL("../components/ui.tsx", import.meta.url), "utf8");
    const submitButton = readFileSync(new URL("../components/form-submit-button.tsx", import.meta.url), "utf8");
    const passwordInput = readFileSync(new URL("../components/password-input.tsx", import.meta.url), "utf8");

    expect(ui).toContain("surface-panel");
    expect(ui).toContain("var(--marketing-accent)");
    expect(ui).not.toContain("#7DD3FC");
    expect(ui).not.toContain("#7AA7FF");

    expect(submitButton).toContain("bg-[#050505]");
    expect(submitButton).toContain("bg-[var(--marketing-accent)]");
    expect(submitButton).not.toContain("bg-[#7DD3FC]");
    expect(submitButton).not.toContain("bg-[#48F5D3]");

    expect(passwordInput).toContain("focus:ring-[var(--marketing-accent)]");
    expect(passwordInput).not.toContain("focus:ring-[#7AA7FF]");
  });

  it("updates cards and admin shared UI to the same visual system", () => {
    const toolCard = readFileSync(new URL("../components/tool-card.tsx", import.meta.url), "utf8");
    const adminUi = readFileSync(new URL("../app/admin/admin-ui.tsx", import.meta.url), "utf8");
    const adminLayout = readFileSync(new URL("../app/admin/layout.tsx", import.meta.url), "utf8");
    const adminToolList = readFileSync(new URL("../app/admin/tool-admin-list.tsx", import.meta.url), "utf8");
    const productImageManager = readFileSync(new URL("../app/admin/tool-product-image-manager.tsx", import.meta.url), "utf8");

    expect(toolCard).toContain("surface-panel");
    expect(toolCard).toContain("text-[var(--marketing-accent)]");
    expect(toolCard).not.toContain("#7DD3FC");
    expect(toolCard).not.toContain("#7AA7FF");

    expect(adminUi).toContain("border-white/14");
    expect(adminUi).toContain("bg-white/7");
    expect(adminUi).toContain("focus:border-[var(--marketing-accent)]");
    expect(adminUi).not.toContain("#7DD3FC");
    expect(adminUi).not.toContain("#7AA7FF");

    expect(adminLayout).toContain("admin-shell-card");
    expect(adminLayout).toContain("admin-nav-link");

    expect(adminToolList).toContain("surface-panel");
    expect(adminToolList).toContain("var(--marketing-accent)");
    expect(adminToolList).not.toContain("#7DD3FC");
    expect(adminToolList).not.toContain("#7AA7FF");
    expect(adminToolList).not.toContain("#48F5D3");

    expect(productImageManager).toContain("var(--marketing-accent)");
    expect(productImageManager).not.toContain("#48F5D3");
  });
});
