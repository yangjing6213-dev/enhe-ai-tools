import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { cardLikeKey, setCardLike, readCardLikes, readCardLikedState } from "./card-likes";

const url = process.env.CARD_LIKES_TEST_DATABASE_URL;
if (url) {
  const parsed = new URL(url);
  if (!["localhost", "127.0.0.1"].includes(parsed.hostname) || !/_test$/.test(parsed.pathname)) throw new Error("Card likes integration requires a dedicated local test database.");
  process.env.DATABASE_URL = url;
  process.env.DIRECT_URL = url;
}
describe.skipIf(!url)("account card likes PostgreSQL persistence", () => {
  const id = randomUUID();
  const tool = { kind: "tool" as const, id: `tool-${id}` };
  const news = { kind: "news" as const, id: `news-${id}` };
  const users = Array.from({ length: 20 }, (_, i) => `like-user-${id}-${i}`);
  beforeAll(async () => {
    await prisma.user.createMany({ data: users.map(id => ({ id, passwordHash: "unused-local-test-hash" })) });
    await prisma.tool.create({ data: { id: tool.id, slug: tool.id, name: "Click test", type: "software", shortDescription: "Test", content: "Test", status: "published" } });
    await prisma.siteSetting.create({ data: { key: cardLikeKey(tool), value: "7" } });
    await prisma.newsArticle.create({ data: { id: news.id, slug: news.id, title: "Click test", summary: "Test", content: "Test", status: "published", likeCount: 7 } });
  });
  afterAll(async () => {
    await prisma.siteSetting.deleteMany({ where: { key: cardLikeKey(tool) } });
    await prisma.tool.deleteMany({ where: { id: tool.id } });
    await prisma.newsArticle.deleteMany({ where: { id: news.id } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  });
  it("preserves historical totals and counts concurrent likes from different accounts", async () => {
    for (const target of [tool, news]) {
      await Promise.all(users.map(user => setCardLike(target, user, true)));
      expect((await readCardLikes([target]))[cardLikeKey(target)]).toBe(27);
      expect((await readCardLikedState([target], users[0]))[cardLikeKey(target)]).toBe(true);
      await Promise.all(users.map(user => setCardLike(target, user, false)));
      expect((await readCardLikes([target]))[cardLikeKey(target)]).toBe(7);
    }
  });
  it("keeps repeated same-account requests idempotent and persists state on fresh connections", async () => {
    for (const target of [tool, news]) {
      await Promise.all(Array.from({ length: 20 }, () => setCardLike(target, users[0], true)));
      await prisma.$disconnect();
      expect((await readCardLikes([target]))[cardLikeKey(target)]).toBe(8);
      expect((await readCardLikedState([target], users[0]))[cardLikeKey(target)]).toBe(true);
      expect(await readCardLikedState([target], users[1])).toEqual({});
      expect(await readCardLikedState([target], undefined)).toEqual({});
      await Promise.all(Array.from({ length: 20 }, () => setCardLike(target, users[0], false)));
      expect((await readCardLikes([target]))[cardLikeKey(target)]).toBe(7);
      expect(await readCardLikedState([target], users[0])).toEqual({});
    }
  });
  it("does not expose or change unpublished and missing content", async () => {
    await prisma.tool.update({ where: { id: tool.id }, data: { status: "draft" } });
    await prisma.newsArticle.update({ where: { id: news.id }, data: { status: "draft" } });
    expect(await readCardLikes([tool, news])).toEqual({});
    expect(await setCardLike(tool, users[0], true)).toBeNull();
    expect(await setCardLike(news, users[0], true)).toBeNull();
    expect(await setCardLike({ kind: "tool", id: "missing-test" }, users[0], true)).toBeNull();
  });
});