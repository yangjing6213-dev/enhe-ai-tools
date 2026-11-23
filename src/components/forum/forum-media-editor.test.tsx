import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ForumMediaEditor, removeForumMediaMarkers } from "./forum-media-editor";

Object.assign(globalThis, { React });

describe("forum media editor", () => {
  it("shows saved topic images with insert and remove controls in admin edit mode", () => {
    const html = renderToStaticMarkup(<ForumMediaEditor
      locale="zh"
      allowVideo={false}
      surface="post"
      initialAttachments={[{ id: "image-1", kind: "image", mimeType: "image/webp", originalName: "封面.webp" }]}
      editableExisting
    />);

    expect(html).toContain("封面.webp");
    expect(html).toContain('src="/api/forum/media/image-1"');
    expect(html).toContain('name="attachmentIds" value="image-1"');
    expect(html).toContain("插入正文");
    expect(html).toContain("长按移除");
    expect(html).toContain("添加图片");
  });

  it("removes an image marker from the topic text when that image is removed", () => {
    expect(removeForumMediaMarkers("前文\n[[media:image-1]]\n后文 [[media:image-2]]", "image-1"))
      .toBe("前文\n\n后文 [[media:image-2]]");
  });
});
