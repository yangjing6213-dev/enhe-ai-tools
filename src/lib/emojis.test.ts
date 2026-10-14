import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { defaultEmojis, parseEmojiCatalog, splitEmojiText, validateEmojiEdits } from "./emojis";
import { insertEmojiAtCaret, isOrdinaryTextField } from "./emojis-input";

describe("managed emojis", () => {
  it("ships 26 transparent high-resolution assets and preserves immutable tokens", () => {
    expect(defaultEmojis).toHaveLength(26);
    expect(new Set(defaultEmojis.map((entry) => entry.id)).size).toBe(26);
    expect(defaultEmojis[0].url).toBe("/images/emojis/enhe_01-transparent.webp");
    expect(defaultEmojis.every((entry) => existsSync(join(process.cwd(), "public", entry.url)))).toBe(true);
  });

  it("moves saved built-in emoji URLs to transparent assets without changing custom URLs", () => {
    const saved = [
      { ...defaultEmojis[0], url: "/images/emojis/enhe_01.webp", enabled: false },
      { ...defaultEmojis[1], url: "/uploads/emojis/123-enhe_custom.webp" },
    ];
    const parsed = parseEmojiCatalog(JSON.stringify(saved));
    expect(parsed.find((entry) => entry.id === "enhe_01")).toMatchObject({
      url: defaultEmojis[0].url,
      enabled: false,
    });
    expect(parsed.find((entry) => entry.id === "enhe_02")?.url).toBe("/uploads/emojis/123-enhe_custom.webp");
  });

  it("keeps archived stickers renderable and unknown tokens as plain text", () => {
    const archived = { ...defaultEmojis[0], enabled: false };
    const parts = splitEmojiText("你好 :enhe_01: :unknown: <script>", [archived]);
    expect(parts).toEqual([
      { text: "你好 " }, { emoji: archived }, { text: " :unknown: <script>" }
    ]);
  });

  it("falls back to defaults for corrupt catalogs and rejects unsafe image addresses", () => {
    expect(parseEmojiCatalog("not json")).toEqual(defaultEmojis);
    expect(parseEmojiCatalog(JSON.stringify([{ ...defaultEmojis[0], url: "javascript:alert(1)" }]))).toEqual(defaultEmojis);
    expect(parseEmojiCatalog(JSON.stringify([{ ...defaultEmojis[0], url: "//evil.test/emoji.svg" }]))).toEqual(defaultEmojis);
  });

  it("allows label/order/visibility edits without replacing historical image identities", () => {
    const edits = defaultEmojis.map(({ id, label, enabled, order }) => ({ id, label, enabled, order }));
    edits[0] = { ...edits[0], label: "新的名字", enabled: false, order: 99 };
    expect(validateEmojiEdits(edits, defaultEmojis).find((entry) => entry.id === "enhe_01"))
      .toMatchObject({ label: "新的名字", enabled: false, url: defaultEmojis[0].url });
    expect(() => validateEmojiEdits(edits.slice(1), defaultEmojis)).toThrow();
    expect(() => validateEmojiEdits([...edits, edits[0]], defaultEmojis)).toThrow();
  });
});

describe("ordinary text insertion", () => {
  it("inserts at the caret, replaces a selection, and respects maxLength", () => {
    expect(insertEmojiAtCaret("ab", 1, 1, ":enhe_01:", 20)).toEqual({ value: "a:enhe_01:b", caret: 10 });
    expect(insertEmojiAtCaret("abc", 1, 2, ":enhe_01:", 20)).toEqual({ value: "a:enhe_01:c", caret: 10 });
    expect(insertEmojiAtCaret("ab", 1, 1, ":enhe_01:", 5)).toBeNull();
  });

  it("covers usernames/search/body while excluding structured and secret fields", () => {
    const field = (props: Record<string, unknown> = {}) => ({ tagName: "INPUT", type: "text", name: "nickname", id: "", disabled: false, readOnly: false, pattern: "", inputMode: "", autocomplete: "", dataset: {}, ...props });
    expect(isOrdinaryTextField(field())).toBe(true);
    expect(isOrdinaryTextField(field({ name: "q", type: "search" }))).toBe(true);
    expect(isOrdinaryTextField(field({ tagName: "TEXTAREA", name: "content" }))).toBe(true);
    for (const props of [{ type: "email" }, { type: "password" }, { type: "tel" }, { name: "toolId" }, { name: "slug" }, { name: "apiKey" }, { name: "email" }, { name: "coverImage" }, { name: "relatedTagIds" }, { name: "filePath" }, { placeholder: "https://example.com" }, { pattern: "[0-9]+" }, { disabled: true }, { readOnly: true }, { inputMode: "numeric" }]) {
      expect(isOrdinaryTextField(field(props))).toBe(false);
    }
  });
});
