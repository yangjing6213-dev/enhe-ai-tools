import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(
  resolve(process.cwd(), "src/app/admin/seo-audit/[id]/page.tsx"),
  "utf8",
);

describe("SEO audit admin run detail page source contract", () => {
  it("loads a server-side detail and returns not found for a missing run", () => {
    expect(pageSource).toContain("getSeoAuditAdminRunDetail(id)");
    expect(pageSource).toContain("if (!run) notFound()");
    expect(pageSource).not.toContain('"use client"');
  });

  it("never renders storage secrets, raw evidence, or full report fields", () => {
    for (const forbiddenField of [
      "reportJsonKey",
      "reportMarkdownKey",
      "leaseTokenHash",
      "publicTokenHash",
      "artifactUploads",
      "summaryFindings",
      "targetUrl",
    ]) {
      expect(pageSource).not.toContain(forbiddenField);
    }
    expect(pageSource).not.toContain("JSON.stringify");
    expect(pageSource).toContain("publicFindings");
    expect(pageSource).toContain("maskedDomain");
    expect(pageSource).toContain("maskedUser");
  });

  it("wires the allowed retry and cancel actions back to this detail page", () => {
    expect(pageSource).toContain("retrySeoAuditRunAction");
    expect(pageSource).toContain("cancelSeoAuditRunAction");
    expect(pageSource).toContain('run.status === "failed"');
    expect(pageSource).toContain('run.status === "queued" || run.status === "running"');
    expect(pageSource).toContain('name="runId"');
    expect(pageSource).toContain('name="returnTo"');
    expect(pageSource).toContain('href="/admin/seo-audit"');
  });
});
