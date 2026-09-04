import { describe, expect, it } from "vitest";
import {
  calculateDevelopmentSummary,
  groupDevelopmentItemsByModule,
  statusMeta
} from "@/lib/development-progress";

describe("development progress helpers", () => {
  it("calculates weighted completion from item statuses", () => {
    const summary = calculateDevelopmentSummary([
      { status: "completed" },
      { status: "completed" },
      { status: "partial" },
      { status: "recommended" },
      { status: "not_started" }
    ]);

    expect(summary).toEqual({
      total: 5,
      completed: 2,
      partial: 1,
      recommended: 1,
      notStarted: 1,
      completionPercent: 50
    });
  });

  it("returns a zero summary when there are no items", () => {
    expect(calculateDevelopmentSummary([])).toMatchObject({
      total: 0,
      completionPercent: 0
    });
  });

  it("groups items by module preserving display order", () => {
    const groups = groupDevelopmentItemsByModule([
      { id: "1", module: "订单支付", sortOrder: 20 },
      { id: "2", module: "用户权限", sortOrder: 10 },
      { id: "3", module: "订单支付", sortOrder: 5 }
    ]);

    expect(groups).toEqual([
      {
        module: "订单支付",
        items: [
          { id: "3", module: "订单支付", sortOrder: 5 },
          { id: "1", module: "订单支付", sortOrder: 20 }
        ]
      },
      {
        module: "用户权限",
        items: [{ id: "2", module: "用户权限", sortOrder: 10 }]
      }
    ]);
  });

  it("exposes Chinese labels for every supported status", () => {
    expect(statusMeta.completed.label).toBe("已完成");
    expect(statusMeta.partial.label).toBe("部分完成");
    expect(statusMeta.not_started.label).toBe("未开始");
    expect(statusMeta.recommended.label).toBe("建议补强");
  });

  it("uses the approved night glass accent classes for status chips", () => {
    const classNames = Object.values(statusMeta).map((meta) => meta.className).join(" ");

    expect(classNames).toContain("var(--marketing-accent)");
    expect(classNames).not.toContain("#48F5D3");
    expect(classNames).not.toContain("#7AA7FF");
    expect(classNames).not.toContain("#7DD3FC");
  });
});
