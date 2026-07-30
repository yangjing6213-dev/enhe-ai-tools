import { describe, expect, it } from "vitest";
import { companyProfile } from "@/lib/company-profile";

describe("companyProfile", () => {
  it("keeps the public ENHE company and contact details in one object", () => {
    expect(companyProfile.name.zh).toBe("深圳市龙岗区恩禾网络科技工作室");
    expect(companyProfile.name.en).toBe("Shenzhen Longgang District Enhe Network Technology Studio");
    expect(companyProfile.address.zh).toContain("宸和路51号");
    expect(companyProfile.phone.href).toBe(`tel:${companyProfile.phone.value}`);
    expect(companyProfile.email.href).toBe(`mailto:${companyProfile.email.value}`);
  });
});
