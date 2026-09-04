import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { DEFAULT_EXTERNAL_PUBLISHING_CHANNELS } from "./external-channel-publish-pack";
import type {
  EbosExternalPublishChannelResult,
  EbosExternalPublishingChannel,
  EbosExternalPublishingWriteResult,
  EbosExternalPublishResultInput
} from "./external-publishing-types";

export function buildExternalPublishResultInputTemplate(options: {
  targetDate: string | Date;
  channels?: EbosExternalPublishingChannel[];
}): EbosExternalPublishResultInput {
  const targetDate = toDateKey(options.targetDate);
  const channels = options.channels ?? DEFAULT_EXTERNAL_PUBLISHING_CHANNELS;

  return {
    inputType: "external_publish_result_input",
    targetDate,
    filledAt: null,
    channelResults: channels.map(createEmptyChannelResult),
    notes: [
      "Fill this file only after real external publishing or real user behavior exists.",
      "Keep unknown or unavailable metrics at 0.",
      "Do not invent published URLs, views, clicks, messages, orders, revenue, refunds, or feedback."
    ],
    warnings: []
  };
}

export async function writeExternalPublishResultInputTemplate(options: {
  targetDate: string | Date;
  filePath: string;
  channels?: EbosExternalPublishingChannel[];
  force?: boolean;
}): Promise<EbosExternalPublishingWriteResult> {
  const input = buildExternalPublishResultInputTemplate({
    targetDate: options.targetDate,
    channels: options.channels
  });

  if (!options.force && await fileExists(options.filePath)) {
    return {
      filePath: options.filePath,
      written: false,
      skippedReason: "external publish result input already exists; use --force to overwrite.",
      input
    };
  }

  await mkdir(dirname(options.filePath), { recursive: true });
  await writeFile(options.filePath, `${JSON.stringify(input, null, 2)}\n`, "utf8");
  return {
    filePath: options.filePath,
    written: true,
    input
  };
}

function createEmptyChannelResult(channel: EbosExternalPublishingChannel): EbosExternalPublishChannelResult {
  return {
    channel,
    published: false,
    publishedAt: null,
    publishedUrl: null,
    listingTitle: null,
    views: 0,
    clicks: 0,
    favorites: 0,
    saves: 0,
    shares: 0,
    messages: 0,
    leads: 0,
    positiveReplies: 0,
    negativeReplies: 0,
    orders: 0,
    paidOrders: 0,
    revenue: 0,
    refundCount: 0,
    refundedAmount: 0,
    userFeedback: [],
    notes: "",
    evidence: [],
    failures: []
  };
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
