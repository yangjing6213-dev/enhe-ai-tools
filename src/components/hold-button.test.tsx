import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import HoldButton from "./hold-button";

describe("HoldButton public contract", () => {
  it("defaults to a non-submitting two-second button without running its action", () => {
    const onHold = vi.fn();
    const html = renderToStaticMarkup(<HoldButton onHold={onHold}>长按删除</HoldButton>);

    expect(html).toContain('type="button"');
    expect(html).toContain('aria-label="长按删除"');
    expect(html).toContain('data-phase="idle"');
    expect(html).toContain('data-direction="right"');
    expect(html).toContain("--hb-hold:2000ms");
    expect(html).toContain("--hb-radius:14px");
    expect(html).toContain("--hb-bg:#27272a");
    expect(html).toContain("--hb-fill:#5227FF");
    expect(onHold).not.toHaveBeenCalled();
  });

  it("preserves native attributes and combines the caller description with its localized hold hint", () => {
    const html = renderToStaticMarkup(<HoldButton
      onHold={() => false}
      id="remove-upload"
      title="删除附件"
      aria-label="长按删除附件"
      aria-describedby="attachment-help"
      hint="按住两秒后删除附件"
      type="submit"
      disabled
      className="upload-remove"
      style={{ width: 240 }}
    >删除</HoldButton>);
    const descriptions = /aria-describedby="([^"]+)"/.exec(html)?.[1].split(" ");

    expect(html).toContain('id="remove-upload"');
    expect(html).toContain('title="删除附件"');
    expect(html).toContain('aria-label="长按删除附件"');
    expect(html).toContain('type="submit"');
    expect(html).toContain('disabled=""');
    expect(html).toContain("upload-remove");
    expect(html).toContain("width:240px");
    expect(descriptions).toHaveLength(2);
    expect(descriptions?.[0]).toBe("attachment-help");
    expect(html).toContain(`id="${descriptions?.[1]}"`);
    expect(html).toContain("按住两秒后删除附件");
  });
});
