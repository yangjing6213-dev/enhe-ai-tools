import { describe, expect, it } from "vitest";
import { buildAiNewsImportPayloadFromHtml } from "@/lib/ai-news-html-import";

describe("AI news HTML import parser", () => {
  it("keeps topic-specific inline article images after extracting the featured cover", () => {
    const payload = buildAiNewsImportPayloadFromHtml({
      html: `
        <article>
          <h1>企业 AI 智能体工作流更新</h1>
          <time datetime="2026-06-19">2026年6月19日</time>
          <meta name="description" content="企业 AI 智能体工作流的最新变化。">
          <meta name="keywords" content="AI智能体, AI工作流自动化">
          <header>
            <img src="https://images.unsplash.com/photo-cover-agent-workflow" alt="AI智能体工作流封面">
          </header>
          <h2 id="facts">事实概述</h2>
          <p>企业开始把 AI 智能体放进更具体的流程管理场景。</p>
          <figure>
            <img src="https://images.unsplash.com/photo-agent-dashboard" alt="AI智能体工作流看板">
            <figcaption>AI智能体工作流看板示意，适合解释企业自动化流程。</figcaption>
          </figure>
          <h2 id="sources">来源</h2>
          <ul><li><a href="https://example.com/agent-workflow">来源报道</a></li></ul>
        </article>
      `,
      publishMode: "published"
    });

    expect(payload.article.coverImage).toBe("https://images.unsplash.com/photo-cover-agent-workflow");
    expect(payload.article.content).toContain("## 事实概述");
    expect(payload.article.content).toContain(
      '![AI智能体工作流看板](https://images.unsplash.com/photo-agent-dashboard "AI智能体工作流看板示意，适合解释企业自动化流程。")'
    );
    expect(payload.article.content).not.toContain("AI智能体工作流封面");
  });

  it("keeps safe ENHE internal links in article body and strips unsafe links", () => {
    const payload = buildAiNewsImportPayloadFromHtml({
      html: `
        <article>
          <h1>AI 工具内链测试</h1>
          <meta name="description" content="测试 AI 资讯正文内链。">
          <p>更多工具可查看 <a href="/software">AI软件应用</a>，账号相关内容可查看 <a href="https://www.enhe-tech.com.cn/account-services">AI账号服务</a>。</p>
          <ul>
            <li>学习 <a href="/skill-learning">AI技能教程</a></li>
            <li>不要保留 <a href="javascript:alert(1)">危险链接</a> 和 <a href="https://example.com/bad">外部正文链接</a></li>
          </ul>
          <h2>来源</h2>
          <a href="https://example.com/source">来源报道</a>
        </article>
      `,
      publishMode: "draft"
    });

    expect(payload.article.content).toContain("[AI软件应用](/software)");
    expect(payload.article.content).toContain("[AI账号服务](/account-services)");
    expect(payload.article.content).toContain("- 学习 [AI技能教程](/skill-learning)");
    expect(payload.article.content).toContain("不要保留 危险链接 和 外部正文链接");
    expect(payload.article.content).not.toContain("javascript:");
    expect(payload.article.content).not.toContain("https://example.com/bad");
  });

  it("extracts CMS SEO, bilingual, tags and source fields from the dedicated CMS section", () => {
    const payload = buildAiNewsImportPayloadFromHtml({
      html: `
        <!doctype html>
        <html lang="zh-CN">
          <head>
            <title>OpenAI 智能体进入工作区：普通团队需要关注什么</title>
            <meta name="description" content="OpenAI 将智能体能力带入工作区，普通团队需要关注权限、流程和账号安全。">
            <meta name="keywords" content="AI智能体, AI工作流自动化">
            <link rel="canonical" href="https://www.enhe-tech.com.cn/ai-news/openai-agent-workspace">
          </head>
          <body>
            <article>
              <header>
                <h1>OpenAI 智能体进入工作区：普通团队需要关注什么</h1>
                <p>作者：恩禾ENHE AI 发布日期：<time datetime="2026-06-18">2026年6月18日</time></p>
                <img src="https://images.unsplash.com/photo-1497366754035-f200968a6e72" alt="AI 工作区自动化">
              </header>
              <nav aria-label="文章目录">
                <h2>文章目录</h2>
                <ol>
                  <li><a href="#facts">事实概述</a></li>
                  <li><a href="#impact">对用户的影响</a></li>
                </ol>
              </nav>
              <section id="facts">
                <h2>事实概述</h2>
                <p>OpenAI 近期将智能体能力进一步整合进工作区场景，重点是帮助用户处理跨工具任务。</p>
              </section>
              <section id="impact">
                <h2>对用户的影响</h2>
                <p>对小团队而言，真正需要评估的是数据权限、账号安全和可复制的自动化流程。</p>
              </section>
              <section id="cms-fields" aria-label="CMS 字段">
                <h2>CMS 字段</h2>
                <section data-field="subtitle"><h3>副标题</h3><p>从智能体新闻看工作流自动化的实际落地条件</p></section>
                <section data-field="keyTakeaways"><h3>核心要点，每行一条</h3><ul><li>智能体正在从演示进入工作区流程</li><li>权限边界比单次生成质量更关键</li><li>账号安全和流程审计会影响落地速度</li></ul></section>
                <section data-field="impactNotes"><h3>这对用户意味着什么</h3><p>用户不应只比较模型参数，而应检查智能体是否能接入常用工具、是否有权限控制、是否适合团队复用。</p></section>
                <section data-field="conclusion"><h3>总结</h3><p>智能体价值正在从单点工具转向可管理的工作流，适合先从低风险重复任务试点。</p></section>
                <section data-field="videoUrl"><h3>视频 URL</h3><p>https://example.com/video</p></section>
                <section data-field="videoTitle"><h3>视频标题</h3><p>AI 智能体工作流演示</p></section>
                <section data-field="videoDescription"><h3>视频说明</h3><p>展示智能体如何辅助团队整理资料、生成任务清单并同步到工作流工具。</p></section>
                <section data-field="seoTitle"><h3>SEO 标题</h3><p>OpenAI 智能体进入工作区：AI工作流自动化如何落地</p></section>
                <section data-field="seoDescription"><h3>SEO 描述</h3><p>OpenAI 智能体能力进入工作区场景，本文客观梳理其对AI智能体、AI工作流自动化、账号安全和团队应用落地的影响。</p></section>
                <section data-field="seoKeywords"><h3>SEO 关键词</h3><p>OpenAI智能体,AI工作流自动化,AI账号安全,AI工具落地</p></section>
                <section data-field="canonicalUrl"><h3>Canonical URL</h3><p>https://www.enhe-tech.com.cn/ai-news/openai-agent-workspace</p></section>
                <section data-field="englishTitle"><h3>English title</h3><p>OpenAI agents enter the workspace: what small teams should watch</p></section>
                <section data-field="englishSubtitle"><h3>English subtitle</h3><p>A practical look at agentic workflow adoption</p></section>
                <section data-field="englishSummary"><h3>English summary</h3><p>OpenAI is bringing agent capabilities closer to workspace use cases, shifting attention from demos to repeatable workflows.</p></section>
                <section data-field="englishContent"><h3>English content</h3><p>OpenAI's agent updates matter because teams need reliable permissions, auditability and repeatable processes before adopting autonomous workflows.</p><ul><li>Start with low-risk tasks.</li><li>Review account and data permissions.</li></ul></section>
                <section data-field="englishKeyTakeaways"><h3>English takeaways</h3><ul><li>Agents are moving toward workspace workflows.</li><li>Permission controls matter for adoption.</li></ul></section>
                <section data-field="englishImpactNotes"><h3>English impact notes</h3><p>Small teams should compare workflow reliability, account safety and integration scope.</p></section>
                <section data-field="englishConclusion"><h3>English conclusion</h3><p>The practical value of agents depends on governed workflow automation, not only model capability.</p></section>
                <section data-field="englishSeoTitle"><h3>English SEO title</h3><p>OpenAI agents and AI workflow automation for small teams</p></section>
                <section data-field="englishKeywords"><h3>English keywords</h3><p>OpenAI agents, AI workflow automation, AI account safety</p></section>
                <section data-field="englishSeoDescription"><h3>English SEO description</h3><p>A concise ENHE AI news brief on OpenAI agents, workflow automation, account safety and practical AI adoption.</p></section>
                <section data-field="tags"><h3>标签，逗号或换行分隔</h3><p>AI资讯, 自动发布, AI智能体, AI工作流自动化</p></section>
                <section data-field="relatedArticleIds"><h3>相关资讯 ID</h3><p>article-a<br>article-b</p></section>
                <section data-field="relatedToolIds"><h3>相关工具 ID</h3><p>tool-a</p></section>
                <section data-field="relatedTutorialIds"><h3>相关教程 ID</h3><p>tutorial-a</p></section>
              </section>
              <section id="sources">
                <h2>来源</h2>
                <ul>
                  <li><a href="https://openai.com/index/introducing-chatgpt-agent/" target="_blank" rel="nofollow noopener noreferrer">OpenAI 官方公告</a></li>
                  <li><a href="https://www.reuters.com/technology/" target="_blank" rel="nofollow noopener noreferrer">Reuters Technology</a></li>
                </ul>
              </section>
            </article>
          </body>
        </html>
      `,
      publishMode: "published",
      tags: ["外部标签"]
    });

    expect(payload.article.subtitle).toBe("从智能体新闻看工作流自动化的实际落地条件");
    expect(payload.article.keyTakeaways).toEqual([
      "智能体正在从演示进入工作区流程",
      "权限边界比单次生成质量更关键",
      "账号安全和流程审计会影响落地速度"
    ]);
    expect(payload.article.impactNotes).toBe(
      "用户不应只比较模型参数，而应检查智能体是否能接入常用工具、是否有权限控制、是否适合团队复用。"
    );
    expect(payload.article.conclusion).toBe("智能体价值正在从单点工具转向可管理的工作流，适合先从低风险重复任务试点。");
    expect(payload.article.videoUrl).toBe("https://example.com/video");
    expect(payload.article.videoTitle).toBe("AI 智能体工作流演示");
    expect(payload.article.videoDescription).toBe("展示智能体如何辅助团队整理资料、生成任务清单并同步到工作流工具。");
    expect(payload.article.seoTitle).toBe("OpenAI 智能体进入工作区：AI工作流自动化如何落地");
    expect(payload.article.seoDescription).toBe(
      "OpenAI 智能体能力进入工作区场景，本文客观梳理其对AI智能体、AI工作流自动化、账号安全和团队应用落地的影响。"
    );
    expect(payload.article.seoKeywords).toBe("OpenAI智能体,AI工作流自动化,AI账号安全,AI工具落地");
    expect(payload.article.keywords).toBe("AI智能体, AI工作流自动化");
    expect(payload.article.canonicalUrl).toBe("https://www.enhe-tech.com.cn/ai-news/openai-agent-workspace");
    expect(payload.article.englishTitle).toBe("OpenAI agents enter the workspace: what small teams should watch");
    expect(payload.article.englishSubtitle).toBe("A practical look at agentic workflow adoption");
    expect(payload.article.englishSummary).toContain("workspace use cases");
    expect(payload.article.englishContent).toContain("OpenAI's agent updates matter");
    expect(payload.article.englishContent).toContain("- Start with low-risk tasks.");
    expect(payload.article.englishKeyTakeaways).toEqual([
      "Agents are moving toward workspace workflows.",
      "Permission controls matter for adoption."
    ]);
    expect(payload.article.englishImpactNotes).toBe("Small teams should compare workflow reliability, account safety and integration scope.");
    expect(payload.article.englishConclusion).toBe("The practical value of agents depends on governed workflow automation, not only model capability.");
    expect(payload.article.englishSeoTitle).toBe("OpenAI agents and AI workflow automation for small teams");
    expect(payload.article.englishKeywords).toBe("OpenAI agents, AI workflow automation, AI account safety");
    expect(payload.article.englishSeoKeywords).toBe("OpenAI agents, AI workflow automation, AI account safety");
    expect(payload.article.englishSeoDescription).toContain("OpenAI agents");
    expect(payload.article.englishDescription).toContain("OpenAI agents");
    expect(payload.article.tags).toEqual([
      "AI智能体",
      "AI工作流自动化",
      "AI资讯",
      "自动发布",
      "外部标签"
    ]);
    expect(payload.article.relatedArticleIds).toEqual(["article-a", "article-b"]);
    expect(payload.article.relatedToolIds).toEqual(["tool-a"]);
    expect(payload.article.relatedTutorialIds).toEqual(["tutorial-a"]);
    expect(payload.article.externalSources).toEqual([
      { title: "OpenAI 官方公告", url: "https://openai.com/index/introducing-chatgpt-agent/", sourceType: "source" },
      { title: "Reuters Technology", url: "https://www.reuters.com/technology/", sourceType: "source" }
    ]);
    expect(payload.article.content).toContain("## 事实概述");
    expect(payload.article.content).toContain("## 对用户的影响");
    expect(payload.article.content).not.toContain("CMS 字段");
    expect(payload.article.content).not.toContain("文章目录");
    expect(payload.article.content).not.toContain("来源");
  });

  it("extracts article fields from no-CSS HTML", () => {
    const payload = buildAiNewsImportPayloadFromHtml({
      html: `
        <article>
          <h1>OpenAI 发布新的智能体能力</h1>
          <time datetime="2026-06-18">2026年6月18日</time>
          <meta name="description" content="这是一条面向 ENHE 用户的 AI 智能体新闻摘要。">
          <meta name="keywords" content="AI智能体, 本地部署AI, AI教程">
          <img src="https://images.unsplash.com/photo-1" alt="AI workspace">
          <h2 id="facts">事实概述</h2>
          <p>OpenAI 发布了新的智能体能力，开发者可以将其用于自动化工作流。</p>
          <ul><li>支持多步骤任务</li><li>强调安全边界</li></ul>
          <blockquote>这类能力会影响团队对 AI 工具的选择。</blockquote>
          <h2 id="sources">来源</h2>
          <ul><li><a href="https://example.com/news">官方公告</a></li></ul>
        </article>
      `,
      publishMode: "published",
      importBatchId: "html-test",
      tags: ["自动发布"],
      categoryName: "AI快讯"
    });

    expect(payload.publishMode).toBe("published");
    expect(payload.publishedAt?.toISOString()).toBe("2026-06-18T00:00:00.000Z");
    expect(payload.importBatchId).toBe("html-test");
    expect(payload.article.title).toBe("OpenAI 发布新的智能体能力");
    expect(payload.article.summary).toBe("这是一条面向 ENHE 用户的 AI 智能体新闻摘要。");
    expect(payload.article.coverImage).toBe("https://images.unsplash.com/photo-1");
    expect(payload.article.categoryName).toBe("AI快讯");
    expect(payload.article.tags).toEqual(["AI智能体", "本地部署AI", "AI教程", "自动发布"]);
    expect(payload.article.externalSources).toEqual([
      { title: "官方公告", url: "https://example.com/news", sourceType: "source" }
    ]);
    expect(payload.article.content).toContain("## 事实概述");
    expect(payload.article.content).toContain("OpenAI 发布了新的智能体能力");
    expect(payload.article.content).toContain("- 支持多步骤任务");
    expect(payload.article.content).toContain("> 这类能力会影响团队对 AI 工具的选择。");
  });

  it("uses the first paragraph as summary when meta description is absent", () => {
    const payload = buildAiNewsImportPayloadFromHtml({
      html: `
        <article>
          <h1>本地部署 AI 工具更新</h1>
          <p>这是一段足够清晰的摘要，说明本地部署 AI 工具的最新变化。</p>
          <h2>来源</h2>
          <a href="https://example.com/local-ai">来源报道</a>
        </article>
      `,
      publishMode: "draft"
    });

    expect(payload.article.summary).toBe("这是一段足够清晰的摘要，说明本地部署 AI 工具的最新变化。");
    expect(payload.article.externalSources).toEqual([
      { title: "来源报道", url: "https://example.com/local-ai", sourceType: "source" }
    ]);
  });

  it("rejects published HTML without source links", () => {
    expect(() =>
      buildAiNewsImportPayloadFromHtml({
        html: "<article><h1>无来源发布</h1><p>这篇文章没有任何可核验来源链接。</p></article>",
        publishMode: "published"
      })
    ).toThrow("Published HTML imports require at least one source link.");
  });

  it("rejects unsafe HTML", () => {
    expect(() =>
      buildAiNewsImportPayloadFromHtml({
        html: "<article><h1>Bad</h1><script>alert(1)</script></article>",
        publishMode: "draft"
      })
    ).toThrow("HTML cannot contain script tags.");

    expect(() =>
      buildAiNewsImportPayloadFromHtml({
        html: '<article><h1 style="color:red">Bad</h1><p>Inline CSS</p></article>',
        publishMode: "draft"
      })
    ).toThrow("HTML cannot contain style attributes.");

    expect(() =>
      buildAiNewsImportPayloadFromHtml({
        html: '<article><h1 onclick="alert(1)">Bad</h1><p>Inline handler</p></article>',
        publishMode: "draft"
      })
    ).toThrow("HTML cannot contain inline event handlers.");
  });
});
