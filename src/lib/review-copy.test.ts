import { describe, expect, it } from "vitest";
import { reviewCompletionNotice, reviewCompletionNoticeEn } from "@/lib/review-copy";

describe("review copy", () => {
  it("keeps the user-facing review completion promise consistent", () => {
    expect(reviewCompletionNotice).toBe("审核目标为2个小时内；需补充材料或人工核验时可能延长，请在订单页查看进度或联系客服。");
    expect(reviewCompletionNoticeEn).toBe("We aim to review within 2 hours; requests needing more information or manual verification may take longer. Check your order page or contact support for progress.");
  });
});
