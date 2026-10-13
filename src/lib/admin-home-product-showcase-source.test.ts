import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("homepage featured product administration", () => {
  it("saves validated, audited content and refreshes both public homepage routes", () => {
    const actions = readFileSync(new URL("../app/admin/actions.ts", import.meta.url), "utf8");
    const helper = readFileSync(new URL("./redesign/home/home-product-showcase.ts", import.meta.url), "utf8");

    expect(actions).toContain("export async function saveHomeProductShowcaseAction");
    expect(actions).toContain("await requireAdmin()");
    expect(actions).toContain("parseHomeProductShowcaseConfig(productsJson)");
    expect(actions).toContain('action: "home_product_showcase.update"');
    expect(actions).toContain('revalidateTag("site-settings")');
    expect(actions).toContain('revalidatePath("/en")');
    expect(helper).toContain('export const HOME_PRODUCT_SHOWCASE_SETTING_KEY = "home_product_showcase_v1"');
  });

  it("connects the editor controls to the bilingual homepage showcase", () => {
    const manager = readFileSync(new URL("../app/admin/home-product-showcase-manager.tsx", import.meta.url), "utf8");
    const page = readFileSync(new URL("../app/admin/product-demos/page.tsx", import.meta.url), "utf8");
    const zhHome = readFileSync(new URL("../app/(zh-public)/page.tsx", import.meta.url), "utf8");
    const enHome = readFileSync(new URL("../app/en/page.tsx", import.meta.url), "utf8");

    expect(page).toContain('title="首页推荐产品管理"');
    expect(page).toContain("<HomeProductShowcaseManager initialProducts={featuredProducts} />");
    expect(manager).toContain("moveHomeShowcaseProduct");
    expect(manager).toContain("新增推荐产品");
    expect(manager).toContain("删除此项");
    expect(manager).toContain("folderPrefix=\"homepage-showcase\"");
    expect(zhHome).toContain("getHomeProductShowcase()");
    expect(enHome).toContain("getHomeProductShowcase()");
  });
});
