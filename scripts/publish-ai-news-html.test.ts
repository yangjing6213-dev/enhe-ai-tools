import { execFile } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const scriptPath = join(process.cwd(), "scripts", "publish-ai-news-html.ts");

type ScriptResult = {
  code: number;
  stdout: string;
  stderr: string;
};

const servers: Array<{ close: () => Promise<void> }> = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

async function createHtmlFile(content = "<article><h1>AI News</h1><p>Body</p></article>") {
  const dir = await mkdtemp(join(tmpdir(), "publish-ai-news-html-"));
  const file = join(dir, "article.html");
  await writeFile(file, content, "utf8");
  return file;
}

async function createBomHtmlFile() {
  return createHtmlFile("\uFEFF<article><h1>AI News</h1><p>Body</p></article>");
}

async function runScript(args: string[], env: Record<string, string>): Promise<ScriptResult> {
  try {
    const result = await execFileAsync(process.execPath, ["--import", "tsx", scriptPath, ...args], {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      timeout: 10000
    });
    return { code: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    const failure = error as Error & { code?: number; stdout?: string; stderr?: string };
    return {
      code: typeof failure.code === "number" ? failure.code : 1,
      stdout: failure.stdout ?? "",
      stderr: failure.stderr ?? failure.message
    };
  }
}

async function withServer(handler: (req: IncomingMessage, res: ServerResponse) => void) {
  const server = createServer(handler);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected TCP server address.");
  }
  servers.push({
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      })
  });
  return `http://127.0.0.1:${address.port}/import`;
}

describe("publish-ai-news-html script", () => {
  it("rejects plaintext remote import URLs before publishing", async () => {
    const file = await createHtmlFile();

    const result = await runScript(["--file", file], {
      AI_NEWS_IMPORT_URL: "http://example.com/import",
      AI_NEWS_IMPORT_TOKEN: "secret"
    });

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Refusing to send AI_NEWS_IMPORT_TOKEN to plaintext remote URL");
  });

  it("publishes UTF-8 BOM HTML as an HTML import request", async () => {
    const file = await createBomHtmlFile();
    let authorization = "";
    let receivedBody = "";
    const url = await withServer((req, res) => {
      authorization = req.headers.authorization ?? "";
      req.setEncoding("utf8");
      req.on("data", (chunk) => {
        receivedBody += chunk;
      });
      req.on("end", () => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, articleId: "article-html", adminUrl: "/admin/ai-news/article-html" }));
      });
    });

    const result = await runScript(
      ["--file", file, "--mode", "published", "--batch", "html-batch", "--category", "AI Flash", "--tags", "AI, Automation"],
      {
        AI_NEWS_IMPORT_URL: url,
        AI_NEWS_IMPORT_TOKEN: "secret"
      }
    );

    const body = JSON.parse(receivedBody) as Record<string, unknown>;
    expect(result.code).toBe(0);
    expect(authorization).toBe("Bearer secret");
    expect(body).toMatchObject({
      format: "html",
      publishMode: "published",
      importBatchId: "html-batch",
      categoryName: "AI Flash",
      tags: ["AI", "Automation"]
    });
    expect(body.html).toBe("<article><h1>AI News</h1><p>Body</p></article>");
    expect(result.stdout).toContain("Imported AI news article: article-html");
  });

  it("marks duplicate cover image import errors as retryable for automation", async () => {
    const file = await createHtmlFile();
    const url = await withServer((_req, res) => {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: false,
          error: "DUPLICATE_COVER_IMAGE",
          message: "AI news cover image is already used by another article."
        })
      );
    });

    const result = await runScript(["--file", file, "--mode", "published"], {
      AI_NEWS_IMPORT_URL: url,
      AI_NEWS_IMPORT_TOKEN: "secret"
    });

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("RETRYABLE_COVER_IMAGE_DUPLICATE");
    expect(result.stderr).toContain("AI news cover image is already used by another article.");
  });
});
