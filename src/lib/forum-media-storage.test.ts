import { mkdtemp, mkdir, readFile, rmdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteForumMediaStoredFile } from "@/lib/forum-media-storage";
afterEach(() => vi.unstubAllEnvs());
describe("forum draft file cleanup", () => {
  it("deletes a private forum file and leaves other private uploads intact", async () => {
    const directory = await mkdtemp(join(tmpdir(), "enhe-forum-media-"));
    const forum = join(directory, "forum-media");
    const other = join(directory, "other.txt");
    await mkdir(forum); await writeFile(join(forum, "draft.webp"), "draft"); await writeFile(other, "keep");
    vi.stubEnv("PRIVATE_UPLOAD_DIR", directory);
    try {
      await expect(deleteForumMediaStoredFile(join(forum, "draft.webp"))).resolves.toBe(true);
      await expect(readFile(join(forum, "draft.webp"))).rejects.toMatchObject({ code: "ENOENT" });
      await expect(deleteForumMediaStoredFile(other)).resolves.toBe(false);
      expect(await readFile(other, "utf8")).toBe("keep");
      await expect(deleteForumMediaStoredFile(join(forum, "draft.webp"))).resolves.toBe(true);
    } finally {
      await unlink(join(forum, "draft.webp")).catch(() => {}); await unlink(other); await rmdir(forum); await rmdir(directory);
    }
  });
});
