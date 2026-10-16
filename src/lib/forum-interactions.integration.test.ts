import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// This opt-in suite never falls back to DATABASE_URL or a repository .env file.
const databaseUrl = process.env.ENHE_FORUM_TEST_DATABASE_URL;
if (databaseUrl) {
  const database = new URL(databaseUrl);
  const name = decodeURIComponent(database.pathname.slice(1));
  if (!["postgres:", "postgresql:"].includes(database.protocol)
    || !["localhost", "127.0.0.1"].includes(database.hostname)
    || !/(?:^|[_-])(test|e2e)(?:[_-]|$)/i.test(name)
    || /(?:^|[_-])(prod|production|live)(?:[_-]|$)/i.test(name)) {
    throw new Error("Forum interaction checks require a dedicated loopback test/e2e database.");
  }
}

describe.skipIf(!databaseUrl)("forum interaction database constraints", () => {
  const prefix = `forum-interactions-${randomUUID()}`;
  const ownerId = `${prefix}-owner`;
  const otherId = `${prefix}-other`;
  const userIds = [ownerId, otherId];
  let db: PrismaClient;

  beforeAll(async () => {
    db = new PrismaClient({ datasourceUrl: databaseUrl! });
    await db.user.createMany({ data: userIds.map((id) => ({ id, passwordHash: "unused-local-test-only", isTestData: true })) });
  });

  afterAll(async () => {
    if (!db) return;
    try {
      await db.forumPost.deleteMany({ where: { authorId: ownerId } });
      await db.user.deleteMany({ where: { id: { in: userIds }, isTestData: true } });
    } finally {
      await db.$disconnect();
    }
  });

  function createPost(suffix: string) {
    return db.forumPost.create({ data: { id: `${prefix}-${suffix}`, authorId: ownerId, category: "question", title: "Local interaction check", content: "Local test fixture", status: "approved" } });
  }

  it("persists one bookmark per account and topic under concurrent requests", async () => {
    const post = await createPost("bookmarks");
    const data = { userId: ownerId, postId: post.id };
    const results = await Promise.all(Array.from({ length: 8 }, () => db.forumBookmark.createMany({ data, skipDuplicates: true })));
    expect(results.reduce((total, result) => total + result.count, 0)).toBe(1);
    expect(await db.forumBookmark.count({ where: { postId: post.id } })).toBe(1);

    await db.forumBookmark.create({ data: { userId: otherId, postId: post.id } });
    const resultsAfterRemoval = await Promise.all(Array.from({ length: 4 }, () => db.forumBookmark.deleteMany({ where: data })));
    expect(resultsAfterRemoval.reduce((total, result) => total + result.count, 0)).toBe(1);
    expect(await db.forumBookmark.findUnique({ where: { userId_postId: data } })).toBeNull();
    expect(await db.forumBookmark.count({ where: { postId: post.id } })).toBe(1);
    expect(await db.forumBookmark.findUnique({ where: { userId_postId: { userId: otherId, postId: post.id } } })).not.toBeNull();
  });

  it("counts distinct sharing accounts despite concurrent duplicate submissions", async () => {
    const post = await createPost("shares");
    const results = await Promise.all(Array.from({ length: 8 }, () => db.forumShare.createMany({ data: { userId: ownerId, postId: post.id }, skipDuplicates: true })));
    expect(results.reduce((total, result) => total + result.count, 0)).toBe(1);
    expect(await db.forumShare.count({ where: { postId: post.id } })).toBe(1);
    await db.forumShare.createMany({ data: { userId: otherId, postId: post.id }, skipDuplicates: true });
    expect(await db.forumShare.count({ where: { postId: post.id } })).toBe(2);
  });

  it("enforces unique keys even when a caller omits duplicate suppression", async () => {
    const post = await createPost("unique");
    const data = { userId: ownerId, postId: post.id };
    await db.forumBookmark.create({ data });
    await db.forumShare.create({ data });
    await expect(db.forumBookmark.create({ data })).rejects.toMatchObject({ code: "P2002" });
    await expect(db.forumShare.create({ data })).rejects.toMatchObject({ code: "P2002" });
    expect(await db.forumBookmark.count({ where: { postId: post.id } })).toBe(1);
    expect(await db.forumShare.count({ where: { postId: post.id } })).toBe(1);
  });
});
