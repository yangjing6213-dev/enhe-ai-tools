import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ articles: [] as Record<string, unknown>[], logs: [] as Record<string, unknown>[] }));
const db = vi.hoisted(() => ({ $transaction: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/ai-news-import", () => ({
  importAiNewsArticleInTransaction: vi.fn(async (_tx, payload) => {
    const article = { ...payload.article, id: `new-${state.articles.length}`, slug: `stored-slug-${state.articles.length}`, status: "draft", publishedAt: null,
      externalSources: payload.article.externalSources, tagLinks: [], updatedAt: new Date() };
    state.articles.push(article);
    return article;
  })
}));

import { batchDigest, batchSchema } from "@/lib/ai-news-batch-contract";
import { handleAiNewsBatch } from "@/lib/ai-news-batch";
import { importAiNewsArticleInTransaction } from "@/lib/ai-news-import";

export function sampleBatch() {
  return {
    runSlot: "2026-09-04T08:00:00+08:00",
    validatorSha256: "a".repeat(64),
    topics: Array.from({ length: 6 }, (_, i) => ({
      kind: i === 5 ? "DURABLE_TASK" : "FRESH_EVENT",
      eventKey: `independent-event-${i}`,
      primarySourceUrl: `https://example.org/announcements/${i}`,
      sourceEvidence: [{ url: `https://example.org/announcements/${i}`, sha256: "b".repeat(64),
        checkedAt: new Date().toISOString(), publishedAt: new Date().toISOString() }],
      mediaEvidence: [{ url: `https://images.unsplash.com/photo-${i}`, license: "Unsplash", evidenceUrl: "https://unsplash.com/license" }],
      html: [{ locale: "zh", sha256: (i * 2).toString(16).repeat(64) }, { locale: "en", sha256: (i * 2 + 1).toString(16).repeat(64) }],
      article: {
        title: `独立新闻主题${i}`, subtitle: `主题副标题${i}`, summary: "测".repeat(120), content: `## 正文\n\n事实${i}。本文由 AI 辅助撰写。`,
        englishTitle: `Independent local announcement ${i}`, englishSubtitle: "Subtitle", englishSummary: "fixture ".repeat(110).trim(), englishContent: `## Facts\n\nAI-assisted distinct event ${i}. ${"This local fixture describes an independent event for transactional safety testing. ".repeat(5)}`,
        seoTitle: `中文标题${i}`, seoDescription: "中文描述", seoKeywords: "资讯", englishSeoTitle: `English title ${i}`, englishSeoDescription: "English description", englishKeywords: "news",
        keyTakeaways: ["关键点"], englishKeyTakeaways: ["Key point"], impactNotes: "影响", englishImpactNotes: "Impact", conclusion: "结论", englishConclusion: "Conclusion",
        tags: ["AI"], coverImage: `https://images.unsplash.com/photo-${i}`,
        externalSources: [{ title: "Primary announcement", url: `https://example.org/announcements/${i}`, sourceType: "primary" }]
      }
    }))
  };
}

const tx = {
  newsArticle: {
    findMany: vi.fn(async () => structuredClone(state.articles)),
    updateMany: vi.fn(async ({ where, data }: { where: { id: { in: string[] }; status: string }; data: object }) => {
      const selected = state.articles.filter(a => where.id.in.includes(a.id as string) && a.status === where.status);
      selected.forEach(a => Object.assign(a, data));
      return { count: selected.length };
    })
  },
  adminAuditLog: {
    findMany: vi.fn(async () => structuredClone(state.logs)),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { state.logs.push(structuredClone(data)); return data; })
  }
};

beforeEach(() => {
  vi.clearAllMocks(); state.articles = []; state.logs = [];
  db.$transaction.mockImplementation(async (callback) => {
    const previous = structuredClone(state);
    try { return await callback(tx); } catch (error) { Object.assign(state, previous); throw error; }
  });
});

async function auditedStage(batch = sampleBatch()) {
  const snapshot = await handleAiNewsBatch({ format: "batch-v2", operation: "snapshot" });
  const digest = batchDigest(batchSchema.parse(batch));
  const audit = { mode: "automated", auditor: "enhe-ai-news-v2", auditedAt: new Date().toISOString(), manifestDigest: digest,
    snapshotDigest: snapshot.snapshot!.digest, validatorSha256: batch.validatorSha256,
    checks: { sourceEvidence: true, mediaRights: true, freshness: true, htmlValidation: true, safety: true,
      aiDisclosure: true, bilingualParity: true, deduplication: true, canonicalSafety: true } };
  return { format: "batch-v2", operation: "stage", batch, audit };
}

describe("AI news V2 batch", () => {
  it("rejects 4+2, missing English, duplicate events, and caller canonical URLs before database access", async () => {
    for (const change of [
      (b: ReturnType<typeof sampleBatch>) => { b.topics[4].kind = "DURABLE_TASK"; },
      (b: ReturnType<typeof sampleBatch>) => { b.topics[0].article.englishContent = ""; },
      (b: ReturnType<typeof sampleBatch>) => { b.topics[1].eventKey = b.topics[0].eventKey; },
      (b: ReturnType<typeof sampleBatch>) => { Object.assign(b.topics[0].article, { canonicalUrl: "https://example.org/candidate" }); }
    ]) {
      const request = await auditedStage(); change(request.batch);
      db.$transaction.mockClear();
      await expect(handleAiNewsBatch(request)).rejects.toThrow();
      expect(db.$transaction).not.toHaveBeenCalled();
    }
  });

  it("stages six drafts in one serializable transaction and replays the same IDs", async () => {
    const request = await auditedStage();
    const first = await handleAiNewsBatch(request);
    const replay = await handleAiNewsBatch(request);
    expect(state.articles).toHaveLength(6);
    expect(state.articles.every(a => a.status === "draft")).toBe(true);
    expect(replay.records).toEqual(first.records);
    expect(first.counts).toEqual({ topicPackageCount: 6, localizedHtmlCount: 12, cmsRecordCount: 6, localizedPublicPageCount: 0 });
    expect(first.records![0].canonicalSlug).toBe("stored-slug-0");
    expect(db.$transaction).toHaveBeenLastCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: "Serializable" }));
  });

  it("rejects changed content in the same slot and stale history", async () => {
    const request = await auditedStage(); await handleAiNewsBatch(request);
    request.batch.topics[0].article.content += " changed";
    request.audit.manifestDigest = batchDigest(batchSchema.parse(request.batch));
    await expect(handleAiNewsBatch(request)).rejects.toThrow("RUN_SLOT_CONFLICT");
    const next = await auditedStage({ ...sampleBatch(), runSlot: "next-slot" });
    state.articles.push({ id: "editor-added", slug: "editor-added", title: "New", status: "published" });
    await expect(handleAiNewsBatch(next)).rejects.toThrow("SNAPSHOT_CHANGED");
  });

  it("blocks a historical source even if title, kind and event key change", async () => {
    state.articles.push({ id: "old", slug: "old-story", title: "Completely different", status: "published", externalSources: [{ url: "https://example.org/announcements/0?utm_source=test#intro" }] });
    const request = await auditedStage();
    await expect(handleAiNewsBatch(request)).rejects.toThrow("DUPLICATE_SOURCE");
    expect(state.articles).toHaveLength(1);
  });

  it("promotes only six owned drafts atomically and replays without modifying existing articles", async () => {
    const existing = { id: "old", slug: "old-story", title: "Existing unrelated article", status: "published", content: "Keep me" };
    state.articles.push(existing);
    const stage = await auditedStage(); const staged = await handleAiNewsBatch(stage);
    const snapshot = await handleAiNewsBatch({ format: "batch-v2", operation: "snapshot", excludeRunSlot: stage.batch.runSlot });
    const request = { format: "batch-v2", operation: "promote", runSlot: stage.batch.runSlot,
      audit: { ...stage.audit, snapshotDigest: snapshot.snapshot!.digest } };
    const published = await handleAiNewsBatch(request); const replay = await handleAiNewsBatch(request);
    expect(published.state).toBe("PUBLISHED_AWAITING_PUBLIC_VERIFICATION");
    expect(replay.records).toEqual(published.records);
    expect(published.records).toHaveLength(6);
    expect(published.counts!.localizedPublicPageCount).toBe(0);
    expect(state.articles[0]).toEqual(existing);
    expect(published.records![0].publicPaths).toEqual([`/ai-news/${staged.records![0].canonicalSlug}`, `/en/ai-news/${staged.records![0].canonicalSlug}`]);
    expect(tx.newsArticle.updateMany).toHaveBeenCalledTimes(1);
  });

  it("fails closed on drift and on incomplete promotion; the transaction rolls back", async () => {
    const stage = await auditedStage(); await handleAiNewsBatch(stage);
    const snapshot = await handleAiNewsBatch({ format: "batch-v2", operation: "snapshot", excludeRunSlot: stage.batch.runSlot });
    const request = { format: "batch-v2", operation: "promote", runSlot: stage.batch.runSlot,
      audit: { ...stage.audit, snapshotDigest: snapshot.snapshot!.digest } };
    const originalContent = state.articles[0].englishContent;
    state.articles[0].englishContent = "Changed by editor";
    await expect(handleAiNewsBatch(request)).rejects.toThrow("STAGED_CONTENT_CHANGED");
    state.articles[0].englishContent = originalContent;
    tx.newsArticle.updateMany.mockResolvedValueOnce({ count: 5 });
    await expect(handleAiNewsBatch(request)).rejects.toThrow("INCOMPLETE_PROMOTION");
    expect(state.articles.every(a => a.status === "draft")).toBe(true);
  });

  it("rolls back the first three drafts when importing the fourth fails", async () => {
    const request = await auditedStage();
    const importer = vi.mocked(importAiNewsArticleInTransaction);
    const implementation = importer.getMockImplementation()!;
    let calls = 0;
    importer.mockImplementation(async (...args) => {
      if (++calls === 4) throw new Error("Simulated fourth article failure");
      return implementation(...args);
    });
    try {
      await expect(handleAiNewsBatch(request)).rejects.toThrow("fourth article");
      expect(calls).toBe(4); expect(state.articles).toHaveLength(0); expect(state.logs).toHaveLength(0);
    } finally { importer.mockImplementation(implementation); }
  });

  it.each(["P2034", "P2002"])("retries a %s transaction conflict without duplicating the batch", async code => {
    const request = await auditedStage(); db.$transaction.mockRejectedValueOnce({ code });
    expect((await handleAiNewsBatch(request)).state).toBe("STAGED");
    expect(state.articles).toHaveLength(6); expect(state.logs).toHaveLength(1);
  });

  it("rejects a changed validator identity, missing rights evidence, and missing AI disclosure", async () => {
    const request = await auditedStage();
    await expect(handleAiNewsBatch(request, { validatorSha256: "f".repeat(64) })).rejects.toThrow("VALIDATOR_VERSION_MISMATCH");
    expect(state.articles).toHaveLength(0);
    const batch = sampleBatch(); batch.topics[0].mediaEvidence = [];
    expect(() => batchSchema.parse(batch)).toThrow();
    const undisclosed = sampleBatch(); undisclosed.topics[0].article.content = "No disclosure";
    expect(() => batchSchema.parse(undisclosed)).toThrow("AI_DISCLOSURE_REQUIRED");
  });

  it("blocks a public slug alias collision introduced after staging", async () => {
    const stage = await auditedStage(); await handleAiNewsBatch(stage);
    state.articles.push({ id: "later-editorial", slug: "stored-slug-0", title: "Different editor headline", status: "published" });
    const current = await handleAiNewsBatch({ format: "batch-v2", operation: "snapshot", excludeRunSlot: stage.batch.runSlot });
    await expect(handleAiNewsBatch({ format: "batch-v2", operation: "promote", runSlot: stage.batch.runSlot,
      audit: { ...stage.audit, snapshotDigest: current.snapshot!.digest } })).rejects.toThrow("CANONICAL_COLLISION");
    expect(state.articles.slice(0, 6).every(article => article.status === "draft")).toBe(true);
  });
});
