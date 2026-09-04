import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("main form submit buttons use duplicate-submit protection", () => {
  it("covers refund processing, comment moderation, file deletion, and user refund requests", () => {
    const refundAdmin = readSource("src/app/admin/refunds/[id]/page.tsx");
    const commentsAdmin = readSource("src/app/admin/comments/page.tsx");
    const filesAdmin = readSource("src/app/admin/files/page.tsx");
    const orderDetail = readSource("src/app/orders/[id]/page.tsx");

    expect(refundAdmin).toContain('SubmitButton name="status" value="completed"');
    expect(refundAdmin).toContain('SubmitButton name="status" value="rejected"');
    expect(commentsAdmin).toContain("SubmitButton");
    expect(filesAdmin).toContain('SubmitButton variant="danger" pendingLabel="删除中..."');
    expect(orderDetail).toContain("FormSubmitButton");
    expect(orderDetail).toContain('pendingLabel="提交中..."');
  });
});
