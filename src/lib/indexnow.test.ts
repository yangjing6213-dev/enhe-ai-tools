import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildIndexNowPayload,
  getIndexNowKey,
  getIndexNowKeyFileName,
  getIndexNowKeyLocation,
  notifyIndexNow,
  submitIndexNowUrls
} from "@/lib/indexnow";

const originalIndexNowKey = process.env.INDEXNOW_KEY;
const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
const publicDir = join(process.cwd(), "public");
const publicIndexNowKeyFileNames = readdirSync(publicDir).filter((fileName) => /^[A-Za-z0-9-]{32,128}\.txt$/.test(fileName));
const publicIndexNowKeyFileName = publicIndexNowKeyFileNames[0];
const publicIndexNowKey = publicIndexNowKeyFileName
  ? readFileSync(join(publicDir, publicIndexNowKeyFileName), "utf8").trim()
  : "";

afterEach(() => {
  vi.restoreAllMocks();
  if (originalIndexNowKey === undefined) {
    delete process.env.INDEXNOW_KEY;
  } else {
    process.env.INDEXNOW_KEY = originalIndexNowKey;
  }
  if (originalAppUrl === undefined) {
    delete process.env.NEXT_PUBLIC_APP_URL;
  } else {
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  }
});

describe("IndexNow integration", () => {
  it("fails closed until an explicit key is configured", () => {
    delete process.env.INDEXNOW_KEY;

    expect(getIndexNowKey()).toBe("");
    expect(getIndexNowKeyFileName()).toBe("");
    expect(getIndexNowKeyLocation()).toBe("");
  });

  it("publishes a root key file whose content matches the explicitly configured key", () => {
    expect(publicIndexNowKeyFileNames).toHaveLength(1);
    expect(publicIndexNowKeyFileName).toBeTruthy();
    expect(publicIndexNowKey).toMatch(/^[A-Za-z0-9-]{32,128}$/);
    process.env.INDEXNOW_KEY = publicIndexNowKey;

    const keyFileName = getIndexNowKeyFileName();
    const keyFilePath = join(publicDir, keyFileName);

    expect(keyFileName).toBe(publicIndexNowKeyFileName);
    expect(existsSync(keyFilePath)).toBe(true);
    expect(readFileSync(keyFilePath, "utf8").trim()).toBe(publicIndexNowKey);
  });

  it("builds an official IndexNow payload with absolute public URLs", () => {
    process.env.INDEXNOW_KEY = publicIndexNowKey;
    process.env.NEXT_PUBLIC_APP_URL = "https://www.enhe-tech.com.cn/";

    expect(buildIndexNowPayload(["/ai-news/new-story", "https://www.enhe-tech.com.cn/software/tool"])).toEqual({
      host: "www.enhe-tech.com.cn",
      key: publicIndexNowKey,
      keyLocation: `https://www.enhe-tech.com.cn/${publicIndexNowKey}.txt`,
      urlList: ["https://www.enhe-tech.com.cn/ai-news/new-story", "https://www.enhe-tech.com.cn/software/tool"]
    });
  });

  it("deduplicates URLs and excludes admin, api, checkout, user, and external URLs", () => {
    process.env.INDEXNOW_KEY = publicIndexNowKey;
    process.env.NEXT_PUBLIC_APP_URL = "https://www.enhe-tech.com.cn";

    expect(
      buildIndexNowPayload([
        "/ai-news/story",
        "/ai-news/story",
        "/admin",
        "/api/health",
        "/login",
        "/user",
        "/orders/123",
        "https://example.com/ai-news/story",
        "notaurl"
      ])?.urlList
    ).toEqual(["https://www.enhe-tech.com.cn/ai-news/story"]);
  });

  it("allows a custom environment key and key location", () => {
    process.env.INDEXNOW_KEY = "custom-indexnow-key-123";
    process.env.NEXT_PUBLIC_APP_URL = "https://www.enhe-tech.com.cn";

    expect(getIndexNowKey()).toBe("custom-indexnow-key-123");
    expect(getIndexNowKeyFileName()).toBe("custom-indexnow-key-123.txt");
    expect(getIndexNowKeyLocation()).toBe("https://www.enhe-tech.com.cn/custom-indexnow-key-123.txt");
  });

  it("posts to the IndexNow endpoint when URLs are valid", async () => {
    process.env.INDEXNOW_KEY = publicIndexNowKey;
    process.env.NEXT_PUBLIC_APP_URL = "https://www.enhe-tech.com.cn";
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitIndexNowUrls(["/ai-news/story"]);

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.indexnow.org/indexnow",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          host: "www.enhe-tech.com.cn",
          key: publicIndexNowKey,
          keyLocation: `https://www.enhe-tech.com.cn/${publicIndexNowKey}.txt`,
          urlList: ["https://www.enhe-tech.com.cn/ai-news/story"]
        })
      })
    );
  });

  it("uses best-effort notification without throwing when IndexNow fails", async () => {
    process.env.INDEXNOW_KEY = publicIndexNowKey;
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(notifyIndexNow(["/ai-news/story"])).resolves.toBeUndefined();
    expect(consoleWarnSpy).toHaveBeenCalledWith("[indexnow] submission failed", expect.any(Error));
  });
});
