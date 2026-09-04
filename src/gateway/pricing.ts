import { Prisma } from "@prisma/client";

export type GatewayModelPricing = {
  pricingModelId: string;
  inputUsdPer1kTokens: string;
  outputUsdPer1kTokens: string;
  costInputUsdPer1kTokens: string;
  costOutputUsdPer1kTokens: string;
  defaultMaxOutputTokens: number;
  maxOutputTokens: number;
};

export type UsageChargeEstimate = {
  costUsd: string;
  chargedUsd: string;
  billable: boolean;
};

const scaleDigits = 8;
const zero = new Prisma.Decimal(0);

const gatewayModelPricing: Record<string, GatewayModelPricing> = {
  "enhe-chat-lite": {
    pricingModelId: "enhe-chat-lite",
    inputUsdPer1kTokens: "0.00100000",
    outputUsdPer1kTokens: "0.00200000",
    costInputUsdPer1kTokens: "0.00100000",
    costOutputUsdPer1kTokens: "0.00200000",
    defaultMaxOutputTokens: 1024,
    maxOutputTokens: 4096
  },
  "enhe-coder-lite": {
    pricingModelId: "enhe-coder-lite",
    inputUsdPer1kTokens: "0.00150000",
    outputUsdPer1kTokens: "0.00300000",
    costInputUsdPer1kTokens: "0.00150000",
    costOutputUsdPer1kTokens: "0.00300000",
    defaultMaxOutputTokens: 1024,
    maxOutputTokens: 4096
  },
  "enhe-claude-compatible": {
    pricingModelId: "enhe-claude-compatible",
    inputUsdPer1kTokens: "0.00300000",
    outputUsdPer1kTokens: "0.01500000",
    costInputUsdPer1kTokens: "0.00300000",
    costOutputUsdPer1kTokens: "0.01500000",
    defaultMaxOutputTokens: 1024,
    maxOutputTokens: 4096
  }
};

export function getGatewayModelPricing(publicModelId: string) {
  return gatewayModelPricing[publicModelId] ?? null;
}

export function getGatewayModelOutputTokenLimit(pricing: GatewayModelPricing, requestedMaxTokens: number | undefined) {
  return requestedMaxTokens ?? pricing.defaultMaxOutputTokens;
}

export function isWithinGatewayModelOutputLimit(pricing: GatewayModelPricing, maxOutputTokens: number) {
  return Number.isInteger(maxOutputTokens) && maxOutputTokens >= 1 && maxOutputTokens <= pricing.maxOutputTokens;
}

export function estimateMaxChargeUsd(input: {
  pricing: GatewayModelPricing;
  messages: Array<Record<string, unknown>>;
  maxOutputTokens: number;
}) {
  const estimatedInputTokens = estimateMessageTokens(input.messages);
  return calculateChargeUsd({
    pricing: input.pricing,
    inputTokens: estimatedInputTokens,
    outputTokens: input.maxOutputTokens
  }).chargedUsd;
}

export function calculateUsageCharge(input: {
  pricing: GatewayModelPricing;
  inputTokens: number;
  outputTokens: number;
}): UsageChargeEstimate {
  const costUsd = calculateCostUsd(input);
  const chargedUsd = calculateChargeUsd(input).chargedUsd;

  return {
    costUsd,
    chargedUsd,
    billable: new Prisma.Decimal(chargedUsd).gt(zero)
  };
}

function calculateCostUsd(input: {
  pricing: GatewayModelPricing;
  inputTokens: number;
  outputTokens: number;
}) {
  const raw = calculateTokenUsd({
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    inputUsdPer1kTokens: input.pricing.costInputUsdPer1kTokens,
    outputUsdPer1kTokens: input.pricing.costOutputUsdPer1kTokens
  });
  return ceilUsd(raw);
}

function calculateChargeUsd(input: {
  pricing: GatewayModelPricing;
  inputTokens: number;
  outputTokens: number;
}) {
  const raw = calculateTokenUsd({
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    inputUsdPer1kTokens: input.pricing.inputUsdPer1kTokens,
    outputUsdPer1kTokens: input.pricing.outputUsdPer1kTokens
  });

  return {
    chargedUsd: ceilUsd(raw)
  };
}

function calculateTokenUsd(input: {
  inputTokens: number;
  outputTokens: number;
  inputUsdPer1kTokens: string;
  outputUsdPer1kTokens: string;
}) {
  const inputUsd = new Prisma.Decimal(input.inputTokens)
    .div(1000)
    .mul(input.inputUsdPer1kTokens);
  const outputUsd = new Prisma.Decimal(input.outputTokens)
    .div(1000)
    .mul(input.outputUsdPer1kTokens);

  return inputUsd.plus(outputUsd);
}

function ceilUsd(value: Prisma.Decimal) {
  if (value.lte(zero)) return zero.toFixed(scaleDigits);

  const scale = new Prisma.Decimal(10).pow(scaleDigits);
  return value.mul(scale).ceil().div(scale).toFixed(scaleDigits);
}

function estimateMessageTokens(messages: Array<Record<string, unknown>>) {
  const serialized = JSON.stringify(messages);
  return Math.max(1, Math.ceil(serialized.length / 4));
}
