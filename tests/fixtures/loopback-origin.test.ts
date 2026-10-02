import { describe, expect, it } from "vitest";
import { isSameLoopbackOrigin } from "./loopback-origin";

describe("same loopback origin guard", () => {
  it.each([
    ["http://localhost:3000/ai-news/topics", "http://localhost:3000"],
    ["http://127.0.0.1:3000/ai-news/topics", "http://127.0.0.1:3000"],
    ["http://[::1]:3000/ai-news/topics", "http://[::1]:3000"],
  ])("allows same-origin loopback URL %s", (requestUrl, baseURL) => {
    expect(isSameLoopbackOrigin(requestUrl, baseURL)).toBe(true);
  });

  it.each([
    ["http://localhost:3001/ai-news/topics", "http://localhost:3000"],
    ["https://localhost:3000/ai-news/topics", "http://localhost:3000"],
    ["http://example.com:3000/ai-news/topics", "http://localhost:3000"],
  ])("rejects a different origin %s", (requestUrl, baseURL) => {
    expect(isSameLoopbackOrigin(requestUrl, baseURL)).toBe(false);
  });
});
