import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "@/middleware";

describe("enforced document CSP", () => {
  it("allows only nonced executable inline scripts in production", () => {
    const response = middleware(new NextRequest("https://www.enhe-tech.com.cn/en/login"));
    const policy = response.headers.get("Content-Security-Policy");
    expect(policy).toBeTruthy();
    const nonce = response.headers.get("x-middleware-request-x-nonce");
    if (!policy) return;
    const scripts = policy.split(";").find((item) => item.trim().startsWith("script-src "))!;
    expect(scripts).toContain(`'nonce-${nonce}'`);
    expect(scripts).toContain("'strict-dynamic'");
    expect(scripts).not.toContain("'unsafe-inline'");
    expect(scripts).not.toContain("'unsafe-eval'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'self'");
    expect(policy).toContain("report-uri /api/csp-report");
  });

  it("uses a distinct server-generated nonce and never trusts a client nonce", () => {
    const req = () => new NextRequest("https://www.enhe-tech.com.cn/en/login", {
      headers: { "x-nonce": "attacker", "Content-Security-Policy": "script-src *" },
    });
    const a = middleware(req()), b = middleware(req());
    const nonce = a.headers.get("x-middleware-request-x-nonce");
    expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(nonce).not.toBe(b.headers.get("x-middleware-request-x-nonce"));
    const policy = a.headers.get("Content-Security-Policy");
    expect(policy).toContain(`'nonce-${nonce}'`);
    expect(a.headers.get("x-middleware-request-content-security-policy")).toBe(policy);
    expect(a.headers.get("Cache-Control")).toContain("no-store");
  });

  it("does not mint document nonces for machine-readable resources", () => {
    const response = middleware(new NextRequest("https://www.enhe-tech.com.cn/sitemap.xml"));
    expect(response.headers.get("x-middleware-request-x-nonce")).toBeNull();
  });

  it("keeps RSC data fetches separate from document nonces", () => {
    const response = middleware(new NextRequest("https://www.enhe-tech.com.cn/ai-topics", {
      headers: { rsc: "1", "next-router-prefetch": "1", "x-nonce": "attacker" },
    }));
    expect(response.headers.get("x-middleware-request-x-nonce")).toBeNull();
    expect(response.headers.get("Content-Security-Policy")).toBeNull();
    const document = middleware(new NextRequest("https://www.enhe-tech.com.cn/ai-topics", {
      headers: { "next-router-prefetch": "1" },
    }));
    expect(document.headers.get("Content-Security-Policy")).toContain("'nonce-");
  });
});
