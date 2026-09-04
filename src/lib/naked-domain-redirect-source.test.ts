import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("naked domain redirect deployment guard", () => {
  it("prepares Nginx to redirect enhe-tech.com.cn to the canonical www host", () => {
    const deployScript = readFileSync(join(process.cwd(), "deploy.sh"), "utf8");

    expect(deployScript).toContain("server_name www.enhe-tech.com.cn enhe-tech.com.cn;");
    expect(deployScript).toContain("if ($host = enhe-tech.com.cn)");
    expect(deployScript).toContain("return 301 https://www.enhe-tech.com.cn$request_uri;");
  });
});
