import { describe, expect, it } from "vitest";
import {
  applyKeywordInterventions,
  buildAiNewsEventFingerprint,
  buildAiNewsKeywordCloud,
  buildAiNewsTopicCollections,
  defaultAiNewsExternalSeoProvider,
  normalizeAiNewsKeyword,
  passesAiNewsKeywordSeoRules,
  scanAiNewsOpportunities,
  type AiNewsOpportunityCandidate,
  type AiNewsOpportunityRecord
} from "@/lib/ai-news-discovery";

const primaryEventSource = "https://github.blog/changelog/2026-07-23-next-mcp";

function buildOpportunityCandidate(
  overrides: Partial<AiNewsOpportunityCandidate> = {},
): AiNewsOpportunityCandidate {
  return {
    id: "mcp-news",
    contentKind: "news",
    eventKey: "github-mcp-next-specification",
    eventName: "GitHub MCP Server next specification",
    eventDate: "2026-07-23",
    eventSourceUrl: primaryEventSource,
    topic: "MCP protocol update",
    userImpact:
      "MCP client initialization behavior may require compatibility checks before an upgrade.",
    userTask: "validate client initialization and record rollback results",
    sourceUrls: [
      primaryEventSource,
      "https://modelcontextprotocol.io/specification/draft",
    ],
    sourceEvidence: [
      {
        url: primaryEventSource,
        authority: "first-party",
        supports: "The announcement documents the MCP server specification change.",
      },
    ],
    queryEvidence: [
      {
        source: "google-search-console",
        query: "github mcp server specification",
        observedAt: "2026-07-26T08:00:00+08:00",
        impressions: 12,
        clicks: 2,
        targetPath: "/ai-news",
      },
    ],
    demandScore: 10,
    bilingual: true,
    ...overrides,
  };
}

function buildOpportunityRecord(
  overrides: Partial<AiNewsOpportunityRecord> = {},
): AiNewsOpportunityRecord {
  const candidate = buildOpportunityCandidate(overrides);
  return {
    id: candidate.id,
    contentKind: candidate.contentKind,
    eventKey: candidate.eventKey,
    eventName: candidate.eventName,
    eventDate: candidate.eventDate,
    eventSourceUrl: candidate.eventSourceUrl,
    topic: candidate.topic,
    userTask: candidate.userTask,
    sourceUrls: candidate.sourceUrls,
  };
}

describe("AI news discovery helpers", () => {
  it("normalizes keywords and removes noisy fragments", () => {
    expect(normalizeAiNewsKeyword("  AIVideo  ")).toBe("AIVideo");
    expect(normalizeAiNewsKeyword("AI")).toBeNull();
    expect(normalizeAiNewsKeyword("2026")).toBeNull();
    expect(normalizeAiNewsKeyword("***")).toBeNull();
  });

  it("checks SEO admission rules against article coverage and signal strength", () => {
    expect(
      passesAiNewsKeywordSeoRules({
        keyword: "AIVideo",
        articleCount: 3,
        searchCount30d: 0,
        totalHeat: 0
      })
    ).toBe(true);
    expect(
      passesAiNewsKeywordSeoRules({
        keyword: "tool",
        articleCount: 10,
        searchCount30d: 12,
        totalHeat: 100
      })
    ).toBe(false);
    expect(
      passesAiNewsKeywordSeoRules({
        keyword: "AIVideo",
        articleCount: 1,
        searchCount30d: 1,
        totalHeat: 1
      })
    ).toBe(false);
  });

  it("applies pin, hide, rename, and weight boost intervention rules", () => {
    const items = applyKeywordInterventions(
      [
        { keyword: "AIVideo", score: 10, displayName: "AIVideo", articleCount: 4, searchCount30d: 7, totalHeat: 22 },
        { keyword: "OpenAI", score: 8, displayName: "OpenAI", articleCount: 3, searchCount30d: 3, totalHeat: 14 }
      ],
      [
        { keyword: "OpenAI", locale: "zh", isPinned: true, isHidden: false, displayName: "OpenAI News", weightBoost: 6 },
        { keyword: "AIVideo", locale: "zh", isPinned: false, isHidden: true, displayName: null, weightBoost: 0 }
      ]
    );

    expect(items).toEqual([expect.objectContaining({ keyword: "OpenAI", displayName: "OpenAI News", isPinned: true })]);
  });

  it("builds a ranked keyword cloud capped to 12 items", async () => {
    const items = await buildAiNewsKeywordCloud({
      locale: "zh",
      candidates: Array.from({ length: 14 }).map((_, index) => ({
        keyword: `AIKeyword${index + 1}`,
        articleCount: 3,
        searchCount30d: index + 1,
        totalHeat: 20 - index,
        freshnessDays: 2,
        tagHits: 1,
        keywordFieldHits: 1
      })),
      interventions: [],
      externalProvider: defaultAiNewsExternalSeoProvider
    });

    expect(items).toHaveLength(12);
    expect(items[0]?.keyword).toBe("AIKeyword14");
  });

  it("caps the English keyword cloud to eight focused items", async () => {
    const items = await buildAiNewsKeywordCloud({
      locale: "en",
      candidates: Array.from({ length: 12 }).map((_, index) => ({
        keyword: `AIKeyword${index + 1}`,
        articleCount: 3,
        searchCount30d: index + 1,
        totalHeat: 20 - index,
        freshnessDays: 2,
        tagHits: 1,
        keywordFieldHits: 1
      })),
      interventions: [],
      externalProvider: defaultAiNewsExternalSeoProvider
    });

    expect(items).toHaveLength(8);
  });

  it("builds exactly five topic collections with keyword fallback", () => {
    const topics = buildAiNewsTopicCollections({
      locale: "zh",
      keywordItems: [
        { keyword: "AIVideo", displayName: "AIVideo", score: 12, articleCount: 4, searchCount30d: 9, totalHeat: 24, isPinned: false },
        { keyword: "ComfyUI", displayName: "ComfyUI", score: 11, articleCount: 4, searchCount30d: 8, totalHeat: 18, isPinned: false }
      ],
      fallbackTags: [
        { keyword: "LocalAI", displayName: "LocalAI", score: 10, articleCount: 4, searchCount30d: 0, totalHeat: 12, isPinned: false },
        { keyword: "AIOffice", displayName: "AIOffice", score: 9, articleCount: 4, searchCount30d: 0, totalHeat: 10, isPinned: false },
        { keyword: "AIAgent", displayName: "AIAgent", score: 8, articleCount: 4, searchCount30d: 0, totalHeat: 8, isPinned: false }
      ]
    });

    expect(topics).toHaveLength(5);
    expect(topics.map((item) => item.query)).toEqual(["AIVideo", "ComfyUI", "LocalAI", "AIOffice", "AIAgent"]);
  });

  it("pads topic collections to five items when live signals are insufficient", () => {
    const topics = buildAiNewsTopicCollections({
      locale: "zh",
      keywordItems: [{ keyword: "AIInfo", displayName: "AIInfo", score: 12, articleCount: 4, searchCount30d: 9, totalHeat: 24, isPinned: false }],
      fallbackTags: [
        { keyword: "ENHEAI", displayName: "ENHEAI", score: 11, articleCount: 4, searchCount30d: 6, totalHeat: 18, isPinned: false },
        { keyword: "TrendInsight", displayName: "TrendInsight", score: 10, articleCount: 4, searchCount30d: 0, totalHeat: 12, isPinned: false },
        { keyword: "ToolWorkflow", displayName: "ToolWorkflow", score: 9, articleCount: 4, searchCount30d: 0, totalHeat: 10, isPinned: false }
      ]
    });

    expect(topics).toHaveLength(5);
    expect(new Set(topics.map((item) => item.key)).size).toBe(5);
  });

  it("keeps the event fingerprint stable across bilingual title rewrites and source subsets", () => {
    const first = buildOpportunityCandidate({
      eventName: "GitHub MCP Server next specification",
      eventSourceUrl: `${primaryEventSource}/?utm_source=enhe#details`,
      sourceUrls: [
        `${primaryEventSource}/?utm_source=enhe#details`,
        "https://modelcontextprotocol.io/specification/draft"
      ]
    });
    const second = buildOpportunityCandidate({
      eventKey: " GITHUB MCP NEXT SPECIFICATION ",
      eventName: "GitHub \u53d1\u5e03 MCP Server \u4e0b\u4e00\u7248\u89c4\u8303",
      eventDate: "2026-07-23T08:00:00Z",
      eventSourceUrl: primaryEventSource,
      sourceUrls: [primaryEventSource]
    });

    expect(buildAiNewsEventFingerprint(first)).toBe(
      buildAiNewsEventFingerprint(second),
    );
  });

  it("does not merge different events with similar titles on the same date", () => {
    const first = buildOpportunityCandidate({
      id: "mcp-server-spec",
      demandScore: 12,
    });
    const second = buildOpportunityCandidate({
      id: "mcp-registry-preview",
      eventKey: "github-mcp-registry-preview",
      eventName: "GitHub MCP Server registry specification",
      eventSourceUrl:
        "https://github.blog/changelog/2026-07-23-mcp-registry-preview",
      sourceUrls: [
        "https://github.blog/changelog/2026-07-23-mcp-registry-preview",
      ],
      sourceEvidence: [
        {
          url: "https://github.blog/changelog/2026-07-23-mcp-registry-preview",
          authority: "first-party",
          supports: "The announcement documents a separate registry preview event.",
        },
      ],
      demandScore: 11,
    });

    const result = scanAiNewsOpportunities({ candidates: [first, second] });

    expect(buildAiNewsEventFingerprint(first)).not.toBe(
      buildAiNewsEventFingerprint(second),
    );
    expect(result.accepted.map((item) => item.id)).toEqual([
      "mcp-server-spec",
      "mcp-registry-preview",
    ]);
  });

  it("keeps distinct Unicode event keys separate on the same date and source", () => {
    const modelUpgrade = buildOpportunityCandidate({
      id: "model-upgrade",
      eventKey: "\u6a21\u578b\u5347\u7ea7",
      eventName: "Model upgrade",
      demandScore: 12,
    });
    const agentUpgrade = buildOpportunityCandidate({
      id: "agent-upgrade",
      eventKey: "\u4ee3\u7406\u5347\u7ea7",
      eventName: "Agent upgrade",
      demandScore: 11,
    });

    const result = scanAiNewsOpportunities({
      candidates: [modelUpgrade, agentUpgrade],
    });

    expect(buildAiNewsEventFingerprint(modelUpgrade)).not.toBe(
      buildAiNewsEventFingerprint(agentUpgrade),
    );
    expect(result.accepted.map((item) => item.id)).toEqual([
      "model-upgrade",
      "agent-upgrade",
    ]);
  });

  it("treats an empty normalized event key as missing evidence", () => {
    const candidate = buildOpportunityCandidate({ eventKey: "---" });
    const result = scanAiNewsOpportunities({ candidates: [candidate] });

    expect(result.accepted).toEqual([]);
    expect(result.decisions).toMatchObject([
      {
        eventFingerprint: null,
        status: "evidence_missing",
        reason: "missing-event-key",
      },
    ]);
    expect(() => buildAiNewsEventFingerprint(candidate)).toThrow(
      "Event key must contain a Unicode letter or number.",
    );
  });

  it("returns evidence_missing and zero output when admission evidence is incomplete", () => {
    const result = scanAiNewsOpportunities({
      candidates: [
        buildOpportunityCandidate({ id: "missing-query", queryEvidence: [] }),
        buildOpportunityCandidate({
          id: "invalid-query",
          queryEvidence: [
            {
              source: "google-search-console",
              query: "github mcp server specification",
              observedAt: "2026-07-26T08:00:00",
              impressions: 0,
            },
          ],
        }),
        buildOpportunityCandidate({ id: "missing-source", sourceEvidence: [] }),
        buildOpportunityCandidate({ id: "missing-impact", userImpact: "AI users" }),
        buildOpportunityCandidate({ id: "generic-task", userTask: "read the news" }),
      ],
    });

    expect(result.accepted).toEqual([]);
    expect(result.decisions.map(({ status, reason }) => ({ status, reason }))).toEqual([
      { status: "evidence_missing", reason: "missing-query-evidence" },
      { status: "evidence_missing", reason: "missing-query-evidence" },
      { status: "evidence_missing", reason: "missing-source-evidence" },
      { status: "evidence_missing", reason: "missing-user-impact" },
      { status: "evidence_missing", reason: "missing-user-task" },
    ]);
  });

  it("requires source authority to match a trusted official domain rule", () => {
    const result = scanAiNewsOpportunities({
      candidates: [
        buildOpportunityCandidate({
          id: "forged-government-authority",
          sourceEvidence: [
            {
              url: primaryEventSource,
              authority: "government",
              supports: "The announcement documents the MCP server specification change.",
            },
          ],
        }),
        buildOpportunityCandidate({
          id: "arbitrary-first-party-domain",
          eventSourceUrl: "https://example.com/announcement",
          sourceUrls: ["https://example.com/announcement"],
          sourceEvidence: [
            {
              url: "https://example.com/announcement",
              authority: "first-party",
              supports: "The arbitrary page claims to document a product change.",
            },
          ],
        }),
      ],
    });

    expect(result.accepted).toEqual([]);
    expect(result.decisions.map(({ status, reason }) => ({ status, reason }))).toEqual([
      { status: "evidence_missing", reason: "missing-source-evidence" },
      { status: "evidence_missing", reason: "missing-source-evidence" },
    ]);
  });

  it("accepts allowed official, government, standards, and primary research sources", () => {
    const trustedSources = [
      {
        id: "github-changelog",
        eventKey: "github-changelog",
        url: primaryEventSource,
        authority: "first-party" as const,
      },
      {
        id: "mcp-specification",
        eventKey: "mcp-specification",
        url: "https://modelcontextprotocol.io/specification/draft",
        authority: "standards-body" as const,
      },
      {
        id: "nist-guidance",
        eventKey: "nist-guidance",
        url: "https://www.nist.gov/publications/artificial-intelligence-guidance",
        authority: "government" as const,
      },
      {
        id: "primary-research",
        eventKey: "primary-research",
        url: "https://arxiv.org/abs/2607.12345",
        authority: "primary-research" as const,
      },
    ];
    const result = scanAiNewsOpportunities({
      candidates: trustedSources.map(({ id, eventKey, url, authority }, index) =>
        buildOpportunityCandidate({
          id,
          eventKey,
          eventSourceUrl: url,
          sourceUrls: [url],
          sourceEvidence: [
            {
              url,
              authority,
              supports: "This allowed official source documents the relevant change.",
            },
          ],
          demandScore: 20 - index,
        }),
      ),
    });

    expect(result.accepted.map((item) => item.id)).toEqual(
      trustedSources.map((item) => item.id),
    );
  });

  it("limits one news page per event despite a bilingual title rewrite", () => {
    const sameEvent = scanAiNewsOpportunities({
      candidates: [
        buildOpportunityCandidate({
          id: "mcp-news-duplicate",
          eventName: "GitHub \u53d1\u5e03 MCP Server \u4e0b\u4e00\u7248\u89c4\u8303",
          topic: "MCP operations analysis",
          userTask: "verify MCP operations and document rollback results",
        }),
        buildOpportunityCandidate({
          id: "mcp-news-primary",
          demandScore: 12,
        }),
      ],
    });

    expect(sameEvent.accepted.map((item) => item.id)).toEqual(["mcp-news-primary"]);
    expect(sameEvent.decisions.map(({ status, reason }) => ({ status, reason }))).toEqual([
      { status: "accepted", reason: "accepted" },
      { status: "rejected", reason: "duplicate-news-event" },
    ]);
  });

  it("requires bilingual output and material distinction for same-event follow-ups", () => {
    const result = scanAiNewsOpportunities({
      existing: [
        buildOpportunityRecord({
          id: "published-mcp-news",
        }),
      ],
      candidates: [
        buildOpportunityCandidate({
          id: "mcp-tutorial",
          contentKind: "evergreen",
          topic: "MCP compatibility testing",
          userTask: "validate initialize and rollback",
          demandScore: 9,
        }),
        buildOpportunityCandidate({
          id: "mcp-reworded-analysis",
          contentKind: "evergreen",
          topic: "MCP protocol update",
          userTask: "validate client initialization and record rollback results",
          demandScore: 8,
        }),
        buildOpportunityCandidate({
          id: "mcp-english-only",
          contentKind: "evergreen",
          topic: "MCP client migration",
          userTask: "migrate an MCP client",
          demandScore: 7,
          bilingual: false,
        }),
      ],
    });

    expect(result.accepted.map((item) => item.id)).toEqual(["mcp-tutorial"]);
    expect(result.decisions.map((item) => item.reason)).toEqual([
      "accepted",
      "insufficient-distinction",
      "bilingual-contract-required"
    ]);
  });
});
