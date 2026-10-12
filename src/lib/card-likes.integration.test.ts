import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { cardLikeKey, incrementCardLike, readCardLikes } from "./card-likes";

const url = process.env.CARD_LIKES_TEST_DATABASE_URL;
if (url) {
  const parsed = new URL(url);
  if (!["localhost", "127.0.0.1"].includes(parsed.hostname) || !/_test$/.test(parsed.pathname)) throw new Error("Card likes integration requires a dedicated local test database.");
  process.env.DATABASE_URL = url;
  process.env.DIRECT_URL = url;
}
describe.skipIf(!url)("card likes PostgreSQL persistence", () => {
  const id = randomUUID();
  const tool = { kind: "tool" as const, id: `tool-${id}` };
  const news = { kind: "news" as const, id: `news-${id}` };
  beforeAll(async () => {
    await prisma.tool.create({ data: { id: tool.id, slug: tool.id, name: "Click test", type: "software", shortDescription: "Test", content: "Test", status: "published" } });
    await prisma.newsArticle.create({ data: { id: news.id, slug: news.id, title: "Click test", summary: "Test", content: "Test", status: "published" } });
  });
  afterAll(async () => {
    await prisma.siteSetting.deleteMany({ where: { key: cardLikeKey(tool) } });
    await prisma.tool.deleteMany({ where: { id: tool.id } });
    await prisma.newsArticle.deleteMany({ where: { id: news.id } });
    await prisma.$disconnect();
  });
  it("starts at zero and saves every concurrent click exactly once", async () => {
    expect(await readCardLikes([tool, news])).toEqual({ [cardLikeKey(tool)]: 0, [cardLikeKey(news)]: 0 });
    for (const target of [tool, news]) {
      const values = await Promise.all(Array.from({ length: 20 }, () => incrementCardLike(target)));
      expect(values.sort((a, b) => a! - b!)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    }
    // Fresh connections prove persistence is in PostgreSQL, not process memory.
    await prisma.$disconnect();
    expect(await readCardLikes([tool, news])).toEqual({ [cardLikeKey(tool)]: 20, [cardLikeKey(news)]: 20 });
  });
  it("does not expose or increment unpublished and missing content", async () => {
    await prisma.tool.update({ where: { id: tool.id }, data: { status: "draft" } });
    await prisma.newsArticle.update({ where: { id: news.id }, data: { status: "draft" } });
    expect(await readCardLikes([tool, news])).toEqual({});
    expect(await incrementCardLike(tool)).toBeNull();
    expect(await incrementCardLike(news)).toBeNull();
    expect(await incrementCardLike({ kind: "tool", id: "missing-test" })).toBeNull();
  });
});
