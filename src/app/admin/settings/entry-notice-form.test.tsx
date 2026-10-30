import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { parseSiteEntryNotice } from "@/lib/site-entry-notice";
import { EntryNoticeForm } from "./entry-notice-form";

Object.assign(globalThis, { React });

describe("admin entry notice form", () => {
  it("offers a switch and editable bilingual title, body, and ending fields", () => {
    const html = renderToStaticMarkup(<EntryNoticeForm initial={parseSiteEntryNotice(undefined)} />);

    expect(html).toContain('name="enabled"');
    for (const field of ["zhTitle", "enTitle", "zhBody", "enBody", "zhEnding", "enEnding"]) {
      expect(html).toContain(`name="${field}"`);
    }
    expect(html).toContain("进入网站公告弹窗");
  });
});
