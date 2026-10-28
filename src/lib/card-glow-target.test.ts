import { describe, expect, it } from "vitest";
import { isCardGlowTarget, isNestedCardGlowTarget } from "./card-glow-target";

describe("sitewide card glow coverage", () => {
  it.each([
    ["ARTICLE", []], ["DIV", ["enhe-reference-editorial-card"]],
    ["A", ["redesign-software-card"]], ["DIV", ["admin-shell-card"]],
    ["SECTION", ["surface-panel"]], ["DIV", ["rb-profile__body"]],
    ["DIV", ["details-panel"]],
    ["DIV", ["rounded-xl", "border"]], ["DIV", ["rounded-2xl", "bg-card"]],
  ] as [string, string[]][])("covers %s %j", (tag, classes) => {
    expect(isCardGlowTarget(tag, classes)).toBe(true);
  });
  it.each([
    ["DIV", ["redesign-home-product-stage"]],
    ["BUTTON", ["rounded-xl", "border"]], ["INPUT", ["rounded-xl", "border"]],
    ["NAV", ["rounded-xl", "border"]], ["DIV", ["enhe-admin-card-grid"]],
    ["DIV", ["card-title"]], ["DIV", ["rounded-full", "border"]],
    ["TABLE", ["bg-card"]], ["SPAN", ["badge-card"]],
  ] as [string, string[]][])("does not treat %s %j as a card", (tag, classes) => {
    expect(isCardGlowTarget(tag, classes)).toBe(false);
  });
  it("covers the shared UI Card without including its header", () => {
    expect(isCardGlowTarget("DIV", [], "card")).toBe(true);
    expect(isCardGlowTarget("DIV", [], "card-header")).toBe(false);
  });
  it("keeps pointer glow on nested cards but skips the outermost card", () => {
    expect(isNestedCardGlowTarget("SECTION", ["surface-panel"], undefined, false)).toBe(false);
    expect(isNestedCardGlowTarget("DIV", ["user-center-record", "rounded-xl", "border"], undefined, true)).toBe(true);
  });
});
