import { describe, expect, it } from "vitest";
import { reviewCompletionNotice, reviewCompletionNoticeEn } from "@/lib/review-copy";

describe("review copy", () => {
  it("keeps the user-facing review completion promise consistent", () => {
    expect(reviewCompletionNotice).toBe("将在2个小时完成审核。");
    expect(reviewCompletionNoticeEn).toBe("Review will be completed within 2 hours.");
  });
});
