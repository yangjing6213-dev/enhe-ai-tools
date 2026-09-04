import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("operation manuals admin wiring", () => {
  it("adds operation manuals to the admin sidebar", () => {
    const layout = read("src/app/admin/layout.tsx");
    const dictionaries = read("src/lib/admin-i18n.ts");

    expect(layout).toContain('["manuals", "/admin/manuals"]');
    expect(dictionaries).toContain("manuals");
    expect(dictionaries).toContain("操作说明");
  });

  it("renders a card list page with new-tab manual links", () => {
    const page = read("src/app/admin/manuals/page.tsx");

    expect(page).toContain("operationManuals");
    expect(page).toContain('target="_blank"');
    expect(page).toContain("/admin/manuals/view/");
  });

  it("serves HTML and assets through admin-protected route handlers", () => {
    const htmlRoute = read("src/app/admin/manuals/view/[slug]/route.ts");
    const assetRoute = read("src/app/admin/manuals/assets/[...path]/route.ts");

    expect(htmlRoute).toContain("getCurrentUser");
    expect(htmlRoute).toContain("text/html; charset=utf-8");
    expect(assetRoute).toContain("getCurrentUser");
    expect(assetRoute).toContain("image/png");
  });

  it("copies operation manual docs into the Docker runner image", () => {
    const dockerfile = read("Dockerfile");

    expect(dockerfile).toContain("COPY --from=builder /app/docs ./docs");
  });
});
