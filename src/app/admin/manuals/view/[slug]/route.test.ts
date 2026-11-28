import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn() }));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));

import { GET } from "./route";

describe("admin operation manual typography", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "admin-1", role: "admin" });
  });

  it.each(["geo-monthly-audit-operations", "enhe-gsc-seo-tutorial"])(
    "serves %s with the embedded OPPO Sans site font",
    async (slug) => {
      const response = await GET(new Request(`https://www.enhe-tech.com.cn/admin/manuals/view/${slug}`), {
        params: Promise.resolve({ slug }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");
      const html = await response.text();
      expect(html).toContain('href="/fonts/oppo-sans-4/oppo-sans-4.0-4f58dbaeaea7.ttf" as="font"');
      expect(html).toContain('font-family:"OPPO Sans 4.0"');
      expect(html).toContain('src:url("/fonts/oppo-sans-4/oppo-sans-4.0-4f58dbaeaea7.ttf")');
      expect(html).toContain("<html lang=\"zh-CN\">");
    },
  );
});
