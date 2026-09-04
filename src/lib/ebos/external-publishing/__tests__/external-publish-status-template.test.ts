import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  buildExternalPublishResultInputTemplate,
  writeExternalPublishResultInputTemplate
} from "../external-publish-status-template";

describe("external publish status template", () => {
  test("defaults every channel to unpublished with zero metrics", () => {
    const input = buildExternalPublishResultInputTemplate({ targetDate: "2026-07-03" });

    expect(input.channelResults).toHaveLength(6);
    expect(input.channelResults.every((result) => result.published === false)).toBe(true);
    expect(input.channelResults.every((result) => result.publishedUrl === null)).toBe(true);
    expect(input.channelResults.every((result) => result.views === 0 && result.revenue === 0)).toBe(true);
  });

  test("does not overwrite existing result input unless force is true", async () => {
    const root = await mkdtemp(join(tmpdir(), "ebos-publish-template-"));
    const filePath = join(root, "external-publish-result-input.json");
    await writeFile(filePath, "{\"custom\":true}\n", "utf8");

    const skipped = await writeExternalPublishResultInputTemplate({ targetDate: "2026-07-03", filePath });
    const afterSkip = await readFile(filePath, "utf8");
    const forced = await writeExternalPublishResultInputTemplate({ targetDate: "2026-07-03", filePath, force: true });
    const afterForce = JSON.parse(await readFile(filePath, "utf8"));

    expect(skipped.written).toBe(false);
    expect(afterSkip).toContain("\"custom\":true");
    expect(forced.written).toBe(true);
    expect(afterForce.channelResults[0].published).toBe(false);
  });
});
