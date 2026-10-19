import { describe, expect, it } from "vitest";
import { parseAiWorkflowCosCredentialsCsv } from "./ai-workflow-cos-credentials";

describe("AI Workflow COS credential CSV mapping", () => {
  it("maps the named columns without evaluating the CSV as environment code", () => {
    expect(parseAiWorkflowCosCredentialsCsv('\uFEFFname,COS_SECRET_KEY,COS_SECRET_ID\r\nunused,"cos key,part",id-value')).toEqual({
      secretId: "id-value",
      secretKey: "cos key,part",
    });
  });

  it("maps the Tencent Cloud credential export column names without exposing their values", () => {
    expect(parseAiWorkflowCosCredentialsCsv("Username,Password,SecretId,SecretKey,LoginURL\nuser,password,id-value,key-value,https://console.cloud.tencent.com")).toEqual({
      secretId: "id-value",
      secretKey: "key-value",
    });
  });

  it("does not accept incomplete credentials", () => {
    expect(parseAiWorkflowCosCredentialsCsv("COS_SECRET_ID,COS_SECRET_KEY\nid-value,")).toBeNull();
    expect(parseAiWorkflowCosCredentialsCsv("COS_SECRET_ID,COS_SECRET_KEY\nid-value")).toBeNull();
  });
});
