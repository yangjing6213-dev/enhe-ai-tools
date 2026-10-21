import { describe, expect, it } from "vitest";
import { buildAiWorkflowCoverSvg } from "./generated-cover";

describe("generated workflow covers", () => {
  it("uses project evidence to distinguish a design workspace from a server collection", () => {
    const design = buildAiWorkflowCoverSvg({ name: "Open Design", description: "Collaborative design workspace for prototypes", repository: "nexu-io/open-design" });
    const servers = buildAiWorkflowCoverSvg({ name: "MCP Servers", description: "A collection of MCP servers", repository: "punkpeye/awesome-mcp-servers" });
    expect(design).toContain("DESIGN WORKSPACE");
    expect(servers).toContain("CONNECTED TOOLS");
    expect(servers).toContain("punkpeye/awesome-mcp-servers");
    expect(design).not.toBe(servers);
  });

  it("escapes untrusted repository text and generates self-contained SVG", () => {
    const svg = buildAiWorkflowCoverSvg({ name: '<script>alert("x")</script>', description: "A & B", repository: "owner/repo" });
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
    expect(svg).not.toMatch(/(?:href|onload)=/i);
    expect(svg).toContain('viewBox="0 0 1600 900"');
  });
});
