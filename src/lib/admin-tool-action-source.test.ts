import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("admin tool action source", () => {
  it("accepts arbitrary download link content instead of requiring a URL prefix", () => {
    const source = readFileSync(join(process.cwd(), "src/app/admin/actions.ts"), "utf8");

    expect(source).toContain("function parseDownloadFileUrl");
    expect(source).toContain("return parseOptionalString(value);");
    expect(source).not.toContain("下载链接需以");
  });

  it("saves tools and price specifications atomically", () => {
    const source = readFileSync(join(process.cwd(), "src/app/admin/actions.ts"), "utf8");

    expect(source).toContain("await prisma.$transaction(async (tx) =>");
    expect(source).toContain("await syncToolPriceSpecs(tx, transactionToolId, priceSpecs)");
    expect(source).toContain("tx.toolPriceSpec.updateMany");
    expect(source).toContain("tx.toolPriceSpec.create");
  });

  it("invalidates every public pricing surface after tool or tutorial changes", () => {
    const source = readFileSync(join(process.cwd(), "src/app/admin/actions.ts"), "utf8");

    expect(source).toContain('revalidateTag("public-tools")');
    expect(source).toContain('revalidatePath("/pricing")');
    expect(source).toContain('revalidatePath("/en/pricing")');
    expect(source).toContain('revalidatePath("/pricing.md")');
    expect(source.match(/revalidatePublicToolCatalog\(\);/g)).toHaveLength(4);
  });
});
