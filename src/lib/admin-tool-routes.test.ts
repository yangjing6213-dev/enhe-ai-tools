import { describe, expect, it } from "vitest";
import { getAdminToolEditPath, getAdminToolNewPath } from "@/lib/admin-tool-routes";

describe("admin tool routes", () => {
  it("builds software tool edit and new paths", () => {
    expect(getAdminToolEditPath("software", "tool-1")).toBe("/admin/software/tool-1");
    expect(getAdminToolNewPath("software")).toBe("/admin/software/new");
  });

  it("builds online tool edit and new paths", () => {
    expect(getAdminToolEditPath("online", "tool-1")).toBe("/admin/online-tools/tool-1");
    expect(getAdminToolNewPath("online")).toBe("/admin/online-tools/new");
  });

  it("builds skill_learning course edit and new paths", () => {
    expect(getAdminToolEditPath("skill_learning", "course-1")).toBe("/admin/skill-learning/course-1");
    expect(getAdminToolNewPath("skill_learning")).toBe("/admin/skill-learning/new");
  });
});
