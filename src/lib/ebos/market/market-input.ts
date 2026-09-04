import { readFile } from "node:fs/promises";
import type {
  EbosMarketManualInput,
  EbosMarketManualSignalInput,
  EbosMarketRssSource,
  EbosMarketSignal
} from "./market-evidence-types";
import type { EbosEvidenceWarning } from "../evidence";
import { normalizeMarketSignal } from "./market-signal-normalizer";

const DEFAULT_OBSERVATION_TOPICS = [
  "AI Agent",
  "AI 视频生成",
  "AI 语音生成",
  "本地部署 AI 工具",
  "SEO/GEO 自动化",
  "AI 工作效率工具",
  "AI 数字产品/Prompt Kit",
  "AI 工作流模板",
  "ComfyUI 工作流",
  "MCP / Browser Agent"
];

export function getDefaultMarketManualInput(): EbosMarketManualInput {
  return {
    observationTopics: DEFAULT_OBSERVATION_TOPICS,
    notes: [
      "manual input 是 ENHE 当前重点观察方向，不代表真实搜索量、销量或市场份额。"
    ],
    signals: DEFAULT_OBSERVATION_TOPICS.map((topic) => ({
      title: topic,
      description: buildDefaultTopicDescription(topic),
      tags: [topic]
    }))
  };
}

export async function loadMarketManualInput(options: {
  input?: EbosMarketManualInput;
  filePath?: string;
} = {}): Promise<{
  input: EbosMarketManualInput;
  warnings: EbosEvidenceWarning[];
}> {
  if (options.input) return { input: options.input, warnings: [] };

  if (options.filePath) {
    try {
      return {
        input: JSON.parse(await readFile(options.filePath, "utf8")) as EbosMarketManualInput,
        warnings: []
      };
    } catch (error) {
      return {
        input: getDefaultMarketManualInput(),
        warnings: [warning(
          "manual_market_input_unavailable",
          `Market manual input file could not be read; default observation seeds were used. ${errorMessage(error)}`,
          "manual_input"
        )]
      };
    }
  }

  return { input: getDefaultMarketManualInput(), warnings: [] };
}

export function parseMarketRssSources(env: Record<string, string | undefined> = process.env): EbosMarketRssSource[] {
  return (env.EBOS_MARKET_RSS_URLS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [url, label] = item.split("|").map((part) => part.trim());
      return {
        url: url!,
        label: label || url!
      };
    });
}

export function normalizeManualMarketSignals(input: EbosMarketManualInput): {
  signals: EbosMarketSignal[];
  warnings: EbosEvidenceWarning[];
} {
  const manualSignals: EbosMarketManualSignalInput[] = input.signals?.length
    ? input.signals
    : input.observationTopics.map((topic) => ({
        title: topic,
        description: buildDefaultTopicDescription(topic),
        tags: [topic]
      }));

  return {
    signals: manualSignals.map((signal) => normalizeMarketSignal({
      source: "manual_input",
      sourceType: "manual",
      title: signal.title,
      description: signal.description,
      tags: signal.tags,
      url: signal.url
    })),
    warnings: [warning(
      "manual_market_seed",
      "manual input 为市场观察方向种子，不代表真实搜索量、销量或趋势数据。",
      "manual_input"
    )]
  };
}

function buildDefaultTopicDescription(topic: string) {
  if (topic.includes("视频")) return "关注 AI video workflow、模板、批量处理和商业化素材包需求。";
  if (topic.includes("语音")) return "关注 AI voice、配音、音频批量处理和内容增长需求。";
  if (topic.includes("本地")) return "关注 local AI、离线部署、降低成本和不会部署的问题。";
  if (topic.includes("SEO") || topic.includes("GEO")) return "关注 SEO/GEO automation、内容增长、回答引擎可见度和工作流模板。";
  if (topic.includes("Prompt")) return "关注 digital product、prompt kit、模板缺口和商业化。";
  if (topic.includes("工作流") || topic.includes("ComfyUI")) return "关注 workflow pack、ComfyUI 工作流、模板缺口和批量处理。";
  if (topic.includes("MCP") || topic.includes("Browser")) return "关注 MCP、browser agent、automation 和跨平台发布。";
  if (topic.includes("Agent")) return "关注 AI Agent automation、workflow templates、节省时间和商业化。";
  return "关注 AI productivity tool、模板化交付、节省时间和内容增长。";
}

function warning(code: string, message: string, source?: string): EbosEvidenceWarning {
  return {
    code,
    severity: "warning",
    message,
    source
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "unknown error";
}
