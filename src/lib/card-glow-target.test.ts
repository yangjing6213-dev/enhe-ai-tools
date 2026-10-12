import { describe, expect, it } from "vitest";
import { isCardGlowTarget } from "./card-glow-target";

describe("sitewide card glow coverage", () => {
  it.each([
    ["ARTICLE", []], ["DIV", ["enhe-reference-editorial-card"]],
    ["A", ["redesign-software-card"]], ["DIV", ["admin-shell-card"]],
    ["SECTION", ["surface-panel"]], ["DIV", ["rb-profile__body"]],
    ["DIV", ["redesign-home-product-stage"]], ["DIV", ["details-panel"]],
    ["DIV", ["rounded-xl", "border"]], ["DIV", ["rounded-2xl", "bg-card"]],
  ] as [string, string[]][])("covers %s %j", (tag, classes) => {
    expect(isCardGlowTarget(tag, classes)).toBe(true);
  });
  it.each([
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
});
