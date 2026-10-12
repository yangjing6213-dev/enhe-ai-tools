import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({ incrementCardLike: vi.fn(), readCardLikes: vi.fn() }));
vi.mock("@/lib/card-likes", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/card-likes")>(), ...store }));
import { GET, POST } from "./route";

function click(body: unknown = { kind: "tool", id: "tool-one" }, origin = "https://example.test", visitor = "test-one") {
  return new Request("https://example.test/api/card-likes", { method: "POST", headers: { origin, "content-type": "application/json", "x-real-ip": visitor }, body: JSON.stringify(body) });
}

describe("public card click totals", () => {
  beforeEach(() => { vi.clearAllMocks(); store.incrementCardLike.mockResolvedValue(8); store.readCardLikes.mockResolvedValue({ "card-like:tool:tool-one": 7 }); });
  it("returns saved totals without caching and does not increment during a read", async () => {
    const response = await GET(new Request("https://example.test/api/card-likes?target=tool:tool-one&target=news:news-one"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ counts: { "card-like:tool:tool-one": 7 } });
    expect(store.incrementCardLike).not.toHaveBeenCalled();
  });
  it.each(["", "?target=other:one", "?target=tool:one:two", `?target=tool:${"x".repeat(101)}`])("rejects invalid reads %s", async query => {
    expect((await GET(new Request(`https://example.test/api/card-likes${query}`))).status).toBe(400);
    expect(store.readCardLikes).not.toHaveBeenCalled();
  });
  it("rejects oversized batches before database access", async () => {
    expect((await GET(new Request(`https://example.test/api/card-likes?${Array.from({ length: 61 }, (_, i) => `target=tool:${i}`).join("&")}`))).status).toBe(400);
  });
  it("increments on every accepted click and returns the authoritative total", async () => {
    store.incrementCardLike.mockResolvedValueOnce(8).mockResolvedValueOnce(9);
    expect(await (await POST(click())).json()).toEqual({ count: 8 });
    expect(await (await POST(click())).json()).toEqual({ count: 9 });
    expect(store.incrementCardLike).toHaveBeenCalledTimes(2);
  });
  it.each(["https://untrusted.test", ""])('rejects untrusted or missing origin "%s"', async origin => {
    expect((await POST(click(undefined, origin))).status).toBe(403);
    expect(store.incrementCardLike).not.toHaveBeenCalled();
  });
  it("does not write invalid, unpublished or missing targets", async () => {
    expect((await POST(click({ kind: "user", id: "one" }))).status).toBe(400);
    expect(store.incrementCardLike).not.toHaveBeenCalled();
    store.incrementCardLike.mockResolvedValue(null);
    expect((await POST(click())).status).toBe(404);
  });
  it("reports a failed save rather than claiming success or returning server details", async () => {
    store.incrementCardLike.mockRejectedValue(new Error("private database details"));
    const response = await POST(click());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "UNAVAILABLE" });
  });
  it("bounds repeated writes without blocking other visitors", async () => {
    for (let i = 0; i < 60; i++) expect((await POST(click(undefined, undefined, "rate-test"))).status).toBe(200);
    expect((await POST(click(undefined, undefined, "rate-test"))).status).toBe(429);
    expect((await POST(click(undefined, undefined, "another-test"))).status).toBe(200);
  });
});
