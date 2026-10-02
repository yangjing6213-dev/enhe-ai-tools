"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Filter, Search, Sparkles } from "lucide-react";
import type {
  BuildYourOwnXDifficulty,
  BuildYourOwnXGoal,
  BuildYourOwnXProject,
  BuildYourOwnXRoute,
  BuildYourOwnXTime,
} from "@/lib/build-your-own-x";
import {
  buildYourOwnXDifficultyLabels,
  buildYourOwnXGoalLabels,
  buildYourOwnXTimeLabels,
} from "@/lib/build-your-own-x";
import type { Locale } from "@/lib/dictionaries";

type Category = {
  slug: string;
  name: string;
  count: number;
};

type Language = {
  name: string;
  count: number;
};

type NavigatorProps = {
  locale: Locale;
  projects: readonly BuildYourOwnXProject[];
  routes: readonly BuildYourOwnXRoute[];
  categories: readonly Category[];
  languages: readonly Language[];
};

const goalOptions: BuildYourOwnXGoal[] = [
  "backend",
  "ai",
  "systems",
  "frontend",
  "devtools",
  "portfolio",
];
const difficultyOptions: BuildYourOwnXDifficulty[] = ["beginner", "intermediate", "advanced"];
const timeOptions: BuildYourOwnXTime[] = ["weekend", "week", "month"];

function getLabel(locale: Locale, labels: { zh: string; en: string }) {
  return locale === "en" ? labels.en : labels.zh;
}

function includesLanguage(project: BuildYourOwnXProject, selectedLanguage: string) {
  if (!selectedLanguage) return true;
  return project.language
    .split("/")
    .map((item) => item.trim().toLowerCase())
    .includes(selectedLanguage.toLowerCase());
}

function buildPrompt({
  locale,
  goal,
  language,
  time,
  difficulty,
  route,
  projects,
}: {
  locale: Locale;
  goal: BuildYourOwnXGoal | "";
  language: string;
  time: BuildYourOwnXTime | "";
  difficulty: BuildYourOwnXDifficulty | "";
  route: BuildYourOwnXRoute | null;
  projects: BuildYourOwnXProject[];
}) {
  const projectLines = projects
    .slice(0, 5)
    .map((project, index) => `${index + 1}. ${project.title} (${project.language}, ${project.category})`)
    .join("\n");

  if (locale === "en") {
    return `You are my engineering learning coach. Based on Build Your Own X style projects, create a practical learning plan for me.

My goal: ${goal ? buildYourOwnXGoalLabels[goal].en : "not specified"}
Preferred language: ${language || "not specified"}
Time budget: ${time ? buildYourOwnXTimeLabels[time].en : "not specified"}
Preferred difficulty: ${difficulty ? buildYourOwnXDifficultyLabels[difficulty].en : "not specified"}
Recommended route: ${route ? route.titleEn : "not specified"}

Candidate projects:
${projectLines || "Please recommend suitable projects first."}

Please output:
1. The best 3 projects for my current stage
2. Why each project is worth doing
3. A 7-day or 14-day task plan
4. The final portfolio outcome
5. A resume bullet and interview explanation for the chosen project`;
  }

  return `你是我的工程学习教练。请基于 Build Your Own X 这类从零实现技术项目，为我制定一份实用学习计划。

我的目标：${goal ? buildYourOwnXGoalLabels[goal].zh : "未指定"}
偏好语言：${language || "未指定"}
时间预算：${time ? buildYourOwnXTimeLabels[time].zh : "未指定"}
难度偏好：${difficulty ? buildYourOwnXDifficultyLabels[difficulty].zh : "未指定"}
推荐路线：${route ? route.title : "未指定"}

候选项目：
${projectLines || "请先帮我推荐适合的项目。"}

请输出：
1. 当前阶段最适合我的 3 个项目
2. 每个项目为什么值得做
3. 7 天或 14 天任务计划
4. 最终作品集产出
5. 可用于简历和面试讲解的项目描述`;
}

export function BuildYourOwnXNavigator({
  locale,
  projects,
  routes,
  categories,
  languages,
}: NavigatorProps) {
  const [query, setQuery] = useState("");
  const [goal, setGoal] = useState<BuildYourOwnXGoal | "">("");
  const [difficulty, setDifficulty] = useState<BuildYourOwnXDifficulty | "">("");
  const [time, setTime] = useState<BuildYourOwnXTime | "">("");
  const [language, setLanguage] = useState("");
  const [category, setCategory] = useState("");
  const [routeSelection, setRouteSelection] = useState({
    slug: routes[0]?.slug ?? "",
    scrollToRoute: false,
  });
  const routeSlug = routeSelection.slug;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const selectLinkedRoute = () => {
      if (!window.location.hash) {
        setRouteSelection({ slug: routes[0]?.slug ?? "", scrollToRoute: false });
        return;
      }
      const linkedRoute = routes.find((route) => window.location.hash === `#route-${route.slug}`);
      if (linkedRoute) setRouteSelection({ slug: linkedRoute.slug, scrollToRoute: true });
    };
    selectLinkedRoute();
    window.addEventListener("hashchange", selectLinkedRoute);
    return () => window.removeEventListener("hashchange", selectLinkedRoute);
  }, [routes]);

  useEffect(() => {
    if (routeSelection.scrollToRoute && window.location.hash === `#route-${routeSelection.slug}`) {
      document.getElementById(`route-${routeSelection.slug}`)?.scrollIntoView({ behavior: "instant" });
    }
  }, [routeSelection]);

  const selectRoute = (slug: string) => {
    setRouteSelection({ slug, scrollToRoute: false });
    window.history.replaceState(window.history.state, "", `#route-${slug}`);
  };

  const selectedRoute = routes.find((route) => route.slug === routeSlug) ?? null;

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const routeCategories = selectedRoute ? new Set(selectedRoute.categories) : null;
    return projects
      .filter((project) => !category || project.category === category)
      .filter((project) => !routeCategories || routeCategories.has(project.category))
      .filter((project) => !goal || project.goals.includes(goal))
      .filter((project) => !difficulty || project.difficulty === difficulty)
      .filter((project) => !time || project.time === time)
      .filter((project) => includesLanguage(project, language))
      .filter((project) => {
        if (!normalizedQuery) return true;
        return `${project.title} ${project.category} ${project.language} ${project.output}`
          .toLowerCase()
          .includes(normalizedQuery);
      });
  }, [category, difficulty, goal, language, projects, query, selectedRoute, time]);

  const prompt = buildPrompt({
    locale,
    goal,
    language,
    time,
    difficulty,
    route: selectedRoute,
    projects: filteredProjects as BuildYourOwnXProject[],
  });

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const resetFilters = () => {
    setQuery("");
    setGoal("");
    setDifficulty("");
    setTime("");
    setLanguage("");
    setCategory("");
    selectRoute(routes[0]?.slug ?? "");
  };

  const text =
    locale === "en"
      ? {
          filters: "Project filters",
          search: "Search project, category, language",
          route: "Learning route",
          allGoals: "All goals",
          allDifficulty: "All difficulty",
          allTime: "Any time budget",
          allLanguages: "All languages",
          allCategories: "All categories",
          reset: "Reset",
          results: "matching projects",
          routeLabel: "Recommended route",
          outcome: "Outcome",
          promptTitle: "AI learning-plan prompt",
          promptIntro:
            "Copy this prompt to ChatGPT, Claude, Gemini, DeepSeek, or LumiOS to generate a personal project plan. The site stays free and does not call a paid API for you.",
          copy: "Copy prompt",
          copied: "Copied",
          source: "Open tutorial",
          noResults: "No matching project. Remove one filter and try again.",
          video: "Video",
          buildOutput: "Build output",
          title: "Find the right project before you start",
        }
      : {
          filters: "项目筛选",
          search: "搜索项目、分类、语言",
          route: "学习路线",
          allGoals: "全部目标",
          allDifficulty: "全部难度",
          allTime: "全部时间",
          allLanguages: "全部语言",
          allCategories: "全部分类",
          reset: "重置",
          results: "个匹配项目",
          routeLabel: "推荐路线",
          outcome: "最终产出",
          promptTitle: "AI 学习计划 Prompt",
          promptIntro:
            "复制到 ChatGPT、Claude、Gemini、DeepSeek 或 LumiOS，即可生成个人项目学习计划。本站保持免费，不替你调用付费 API。",
          copy: "复制 Prompt",
          copied: "已复制",
          source: "打开原始教程",
          noResults: "没有匹配项目。减少一个筛选条件后再试。",
          video: "视频",
          buildOutput: "项目产出",
          title: "先选对项目，再开始动手",
        };

  return (
    <div className="byox-app" id="navigator">
      <section className="byox-filter-panel surface-panel">
        <div className="byox-filter-header">
          <div>
            <p className="byox-kicker">
              <Filter size={15} aria-hidden="true" />
              {text.filters}
            </p>
            <h2>{text.title}</h2>
          </div>
          <button type="button" className="byox-reset-button" onClick={resetFilters}>
            {text.reset}
          </button>
        </div>

        <div className="byox-controls">
          <label className="byox-search">
            <Search size={17} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={text.search}
            />
          </label>

          <select value={routeSlug} onChange={(event) => selectRoute(event.target.value)} aria-label={text.route}>
            {routes.map((route) => (
              <option key={route.slug} value={route.slug}>
                {locale === "en" ? route.titleEn : route.title}
              </option>
            ))}
          </select>

          <select value={goal} onChange={(event) => setGoal(event.target.value as BuildYourOwnXGoal | "")} aria-label={text.allGoals}>
            <option value="">{text.allGoals}</option>
            {goalOptions.map((option) => (
              <option key={option} value={option}>
                {getLabel(locale, buildYourOwnXGoalLabels[option])}
              </option>
            ))}
          </select>

          <select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label={text.allLanguages}>
            <option value="">{text.allLanguages}</option>
            {languages.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name} ({item.count})
              </option>
            ))}
          </select>

          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as BuildYourOwnXDifficulty | "")} aria-label={text.allDifficulty}>
            <option value="">{text.allDifficulty}</option>
            {difficultyOptions.map((option) => (
              <option key={option} value={option}>
                {getLabel(locale, buildYourOwnXDifficultyLabels[option])}
              </option>
            ))}
          </select>

          <select value={time} onChange={(event) => setTime(event.target.value as BuildYourOwnXTime | "")} aria-label={text.allTime}>
            <option value="">{text.allTime}</option>
            {timeOptions.map((option) => (
              <option key={option} value={option}>
                {getLabel(locale, buildYourOwnXTimeLabels[option])}
              </option>
            ))}
          </select>

          <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label={text.allCategories}>
            <option value="">{text.allCategories}</option>
            {categories.map((item) => (
              <option key={item.slug} value={item.name}>
                {item.name} ({item.count})
              </option>
            ))}
          </select>
        </div>
      </section>

      {selectedRoute ? (
        <section className="byox-route-panel surface-panel-soft" id={`route-${selectedRoute.slug}`}>
          <div>
            <p className="byox-kicker">
              <Sparkles size={15} aria-hidden="true" />
              {text.routeLabel}
            </p>
            <h2>{locale === "en" ? selectedRoute.titleEn : selectedRoute.title}</h2>
            <p>{locale === "en" ? selectedRoute.summaryEn : selectedRoute.summary}</p>
          </div>
          <div className="byox-route-outcome">
            <span>{text.outcome}</span>
            <strong>{locale === "en" ? selectedRoute.outcomeEn : selectedRoute.outcome}</strong>
          </div>
        </section>
      ) : null}

      <section className="byox-results-layout">
        <div className="byox-results-main">
          <div className="byox-results-bar">
            <h2>
              {filteredProjects.length} {text.results}
            </h2>
          </div>

          {filteredProjects.length ? (
            <div className="byox-project-grid">
              {filteredProjects.slice(0, 80).map((project) => (
                <article className="byox-project-card" key={project.slug}>
                  <div className="byox-project-card-top">
                    <span>{project.category}</span>
                    {project.isVideo ? <em>{text.video}</em> : null}
                  </div>
                  <h3>{project.title}</h3>
                  <p>
                    {text.buildOutput}: {project.output}
                  </p>
                  <div className="byox-chip-row">
                    <span>{project.language}</span>
                    <span>{getLabel(locale, buildYourOwnXDifficultyLabels[project.difficulty])}</span>
                    <span>{getLabel(locale, buildYourOwnXTimeLabels[project.time])}</span>
                  </div>
                  <a href={project.url} target="_blank" rel="noreferrer" className="byox-source-link">
                    {text.source}
                    <ExternalLink size={15} aria-hidden="true" />
                  </a>
                </article>
              ))}
            </div>
          ) : (
            <div className="byox-empty surface-panel-soft">{text.noResults}</div>
          )}
        </div>

        <aside className="byox-prompt-card surface-panel">
          <p className="byox-kicker">
            <Sparkles size={15} aria-hidden="true" />
            {text.promptTitle}
          </p>
          <p>{text.promptIntro}</p>
          <pre tabIndex={0} aria-label={text.promptTitle}>
            {prompt}
          </pre>
          <button type="button" className="byox-copy-button" onClick={copyPrompt}>
            {copied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
            {copied ? text.copied : text.copy}
          </button>
        </aside>
      </section>
    </div>
  );
}
