import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("global night glass page adoption source contract", () => {
  it("uses shared filter and form classes on public listing pages", () => {
    for (const pagePath of ["../app/software/page-shell.tsx", "../app/online-tools/page-shell.tsx", "../app/skill-learning/page-shell.tsx"]) {
      const page = readFileSync(new URL(pagePath, import.meta.url), "utf8");
      expect(page).toContain("filter-surface");
      expect(page).toContain("form-control-dark");
      expect(page).toContain("form-select-dark");
      expect(page).not.toContain("bg-[#7AA7FF]");
      expect(page).not.toContain("focus:border-[#7AA7FF]");
    }
  });

  it("uses shared surface and form classes on auth pages", () => {
    for (const pagePath of ["../app/(auth)/login/page-shell.tsx", "../app/(auth)/register/page-shell.tsx"]) {
      const page = readFileSync(new URL(pagePath, import.meta.url), "utf8");
      expect(page).toContain("surface-panel");
      expect(page).toContain("form-control-dark");
      expect(page).not.toContain("bg-[#7AA7FF]");
      expect(page).not.toContain("focus:border-[#7AA7FF]");
    }
  });

  it("uses shared surface classes on user and order pages", () => {
    const user = readFileSync(new URL("../app/user/page-shell.tsx", import.meta.url), "utf8");
    const order = readFileSync(new URL("../app/orders/[id]/page.tsx", import.meta.url), "utf8");
    const pay = readFileSync(new URL("../app/orders/[id]/pay/page.tsx", import.meta.url), "utf8");

    expect(user).toContain("surface-panel");
    expect(user).toContain("surface-panel-soft");
    expect(user).toContain("form-control-dark");
    expect(order).toContain("surface-panel");
    expect(order).toContain("form-control-dark");
    expect(pay).toContain("surface-panel");
    expect(pay).not.toContain("bg-[#7AA7FF]");
  });
});
