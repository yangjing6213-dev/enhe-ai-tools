import { readFileSync } from "node:fs";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

const stylesheet = postcss.parse(readFileSync(new URL("./forum.css", import.meta.url), "utf8"));

function declarationsFor(selector: string) {
  let declarations: Map<string, string> | undefined;
  stylesheet.walkRules((rule) => {
    if (!declarations && rule.selector.split(",").some((candidate) => candidate.trim() === selector)) {
      declarations = new Map(rule.nodes.flatMap((node) => node.type === "decl" ? [[node.prop, node.value] as [string, string]] : []));
    }
  });
  return declarations;
}

describe("forum topic action icon colors", () => {
  it("keeps all action icons flat and black until an action is active", () => {
    const base = declarationsFor(".forum-action-icon");
    expect(base?.get("color")).toBe("#000");
    expect(base?.get("border")).toBe("0");
    expect(base?.get("background")).toBe("transparent");
    expect(base?.get("box-shadow")).toBe("none");
  });

  it.each([
    [".forum-action--share[data-shared=\"true\"] .forum-action-icon", "#16a34a"],
    [".forum-action--like[aria-pressed=\"true\"] .forum-action-icon", "#e23b63"],
    [".forum-action--bookmark[aria-pressed=\"true\"] .forum-action-icon", "#0462c2"],
  ])("colors active icon %s", (selector, color) => {
    const active = declarationsFor(selector);
    expect(active?.get("color")).toBe(color);
    expect(active?.has("border")).toBe(false);
    expect(active?.has("background")).toBe(false);
  });
});
