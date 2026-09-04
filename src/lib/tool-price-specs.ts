export type ToolPriceSpecStatus = "active" | "disabled";

export type ToolPriceSpecDraft = {
  id: string | null;
  name: string;
  price: number;
  sortOrder: number;
  status: ToolPriceSpecStatus;
};

export type ToolPriceSpecLike = {
  id: string;
  name: string;
  price: unknown;
  sortOrder: number;
  status: ToolPriceSpecStatus;
};

function parseOptionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function parsePrice(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const price = Number(text);
  if (!Number.isFinite(price)) throw new Error("价格规格的金额必须是数字");
  if (price < 0) throw new Error("价格规格的金额不能小于 0");
  return price;
}

function parseSortOrder(value: FormDataEntryValue | null, fallback: number) {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  const sortOrder = Number.parseInt(text, 10);
  return Number.isFinite(sortOrder) ? sortOrder : fallback;
}

export function parseToolPriceSpecsFromFormData(formData: FormData) {
  const rowCount = Math.min(Math.max(Number.parseInt(String(formData.get("priceSpecRowCount") ?? "0"), 10) || 0, 0), 20);
  const specs: Array<ToolPriceSpecDraft & { rowIndex: number }> = [];

  for (let index = 0; index < rowCount; index += 1) {
    const id = parseOptionalText(formData.get(`priceSpecId_${index}`));
    const name = parseOptionalText(formData.get(`priceSpecName_${index}`));
    const price = parsePrice(formData.get(`priceSpecPrice_${index}`));
    const hasAnyValue = Boolean(id || name || price !== null);
    if (!hasAnyValue) continue;
    if (id && !name && price === null) continue;
    if (!name) throw new Error("请填写价格规格名称");
    if (price === null) throw new Error("请填写价格规格金额");

    specs.push({
      id,
      name,
      price,
      sortOrder: parseSortOrder(formData.get(`priceSpecSortOrder_${index}`), index),
      status: formData.get(`priceSpecActive_${index}`) ? "active" : "disabled",
      rowIndex: index
    });
  }

  return specs
    .sort((left, right) => left.sortOrder - right.sortOrder || left.rowIndex - right.rowIndex)
    .map(({ rowIndex: _rowIndex, ...spec }) => spec);
}

export function getPrimaryToolPriceSpec<T extends { price: unknown; status: ToolPriceSpecStatus }>(specs: T[]) {
  return specs.find((spec) => spec.status === "active" && Number(spec.price) > 0) ?? null;
}

export function getPrimaryToolPrice(specs: Array<{ price: unknown; status: ToolPriceSpecStatus }>, fallbackPrice: unknown = 0) {
  const primary = getPrimaryToolPriceSpec(specs);
  return primary ? Number(primary.price) : Number(fallbackPrice ?? 0) || 0;
}

export function resolveToolOrderPriceSpec<T extends ToolPriceSpecLike>(specs: T[], requestedSpecId: string | null) {
  const activeSpecs = specs.filter((spec) => spec.status === "active" && Number(spec.price) > 0);
  if (!activeSpecs.length) return null;
  if (!requestedSpecId) return activeSpecs[0];
  const selected = activeSpecs.find((spec) => spec.id === requestedSpecId);
  if (!selected) throw new Error("请选择有效的购买规格");
  return selected;
}
