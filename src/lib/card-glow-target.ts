/** Match card containers, not card titles, controls, tables or layout grids. */
export function isCardGlowTarget(tag: string, classes: string[], slot?: string | null) {
  if (!["DIV", "SECTION", "ARTICLE", "A", "LI", "ASIDE", "DL", "FORM"].includes(tag)) return false;
  if (slot === "card" || tag === "ARTICLE") return true;
  if (classes.some(name => /(?:^|-)(card|panel|tile)$/.test(name))) return true;
  if (classes.some(name => [
    "glass", "surface-panel", "surface-panel-soft", "filter-surface",
    "home-product-preview", "home-product-preview-empty", "home-fallback-link",
    "enhe-reference-editorial-links", "rb-profile__body",
  ].includes(name))) return !classes.includes("rounded-full");
  const rounded = classes.some(name => name.startsWith("rounded") && name !== "rounded-full");
  const surface = classes.some(name => name === "border" || name === "bg-card" || name.startsWith("bg-[var(--marketing-card"));
  return rounded && surface && !classes.includes("rounded-full") && (tag !== "A" || classes.includes("block"));
}

export function isNestedCardGlowTarget(
  tag: string,
  classes: string[],
  slot: string | null | undefined,
  hasCardAncestor: boolean,
) {
  return hasCardAncestor && isCardGlowTarget(tag, classes, slot);
}
