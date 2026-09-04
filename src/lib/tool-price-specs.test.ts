import { describe, expect, it } from "vitest";
import {
  getPrimaryToolPriceSpec,
  parseToolPriceSpecsFromFormData,
  resolveToolOrderPriceSpec
} from "@/lib/tool-price-specs";

describe("tool price specs", () => {
  it("parses named specification rows and uses the first active price as the primary purchase price", () => {
    const formData = new FormData();
    formData.set("priceSpecRowCount", "3");
    formData.set("priceSpecName_0", "单机授权");
    formData.set("priceSpecPrice_0", "9.9");
    formData.set("priceSpecSortOrder_0", "2");
    formData.set("priceSpecActive_0", "on");
    formData.set("priceSpecName_1", "终身授权");
    formData.set("priceSpecPrice_1", "99");
    formData.set("priceSpecSortOrder_1", "1");
    formData.set("priceSpecActive_1", "on");
    formData.set("priceSpecName_2", "");
    formData.set("priceSpecPrice_2", "");

    const specs = parseToolPriceSpecsFromFormData(formData);

    expect(specs).toEqual([
      { id: null, name: "终身授权", price: 99, sortOrder: 1, status: "active" },
      { id: null, name: "单机授权", price: 9.9, sortOrder: 2, status: "active" }
    ]);
    expect(getPrimaryToolPriceSpec(specs)?.price).toBe(99);
  });

  it("keeps existing disabled specification rows but excludes them from primary price", () => {
    const formData = new FormData();
    formData.set("priceSpecRowCount", "2");
    formData.set("priceSpecId_0", "spec-old");
    formData.set("priceSpecName_0", "停用规格");
    formData.set("priceSpecPrice_0", "29");
    formData.set("priceSpecSortOrder_0", "0");
    formData.set("priceSpecName_1", "有效规格");
    formData.set("priceSpecPrice_1", "49");
    formData.set("priceSpecSortOrder_1", "1");
    formData.set("priceSpecActive_1", "on");

    const specs = parseToolPriceSpecsFromFormData(formData);

    expect(specs).toEqual([
      { id: "spec-old", name: "停用规格", price: 29, sortOrder: 0, status: "disabled" },
      { id: null, name: "有效规格", price: 49, sortOrder: 1, status: "active" }
    ]);
    expect(getPrimaryToolPriceSpec(specs)?.name).toBe("有效规格");
  });

  it("treats a cleared existing specification row as removed from the submitted set", () => {
    const formData = new FormData();
    formData.set("priceSpecRowCount", "1");
    formData.set("priceSpecId_0", "spec-old");
    formData.set("priceSpecName_0", "");
    formData.set("priceSpecPrice_0", "");

    expect(parseToolPriceSpecsFromFormData(formData)).toEqual([]);
  });

  it("rejects incomplete or negative specification rows", () => {
    const formData = new FormData();
    formData.set("priceSpecRowCount", "1");
    formData.set("priceSpecName_0", "单机授权");
    formData.set("priceSpecPrice_0", "-1");
    formData.set("priceSpecActive_0", "on");

    expect(() => parseToolPriceSpecsFromFormData(formData)).toThrow("价格规格的金额不能小于 0");
  });

  it("resolves the selected order specification before falling back to the primary price", () => {
    const specs = [
      { id: "single", name: "单机授权", price: 9.9, sortOrder: 0, status: "active" as const },
      { id: "life", name: "终身授权", price: 99, sortOrder: 1, status: "active" as const }
    ];

    expect(resolveToolOrderPriceSpec(specs, "life")).toEqual(specs[1]);
    expect(resolveToolOrderPriceSpec(specs, null)).toEqual(specs[0]);
    expect(() => resolveToolOrderPriceSpec(specs, "missing")).toThrow("请选择有效的购买规格");
  });
});
