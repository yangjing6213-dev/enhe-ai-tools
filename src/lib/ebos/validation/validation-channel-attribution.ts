import type {
  EbosValidationChannelAttribution,
  EbosValidationChannelAttributionSummary,
  EbosValidationResultInput
} from "./validation-types";

export function attributeValidationResultsByChannel(
  result: EbosValidationResultInput
): EbosValidationChannelAttributionSummary {
  const channels = [
    summarizeMarketplaceResults(result),
    summarizeProductPageResults(result),
    summarizeManualOutreachResults(result),
    summarizePricingTestResults(result)
  ];

  return {
    planId: result.planId,
    channels,
    summary: channels.map((channel) => `${channel.channel}: ${channel.summary}`),
    recommendations: unique(channels.flatMap((channel) => channel.recommendations))
  };
}

export function summarizeMarketplaceResults(
  result: EbosValidationResultInput
): EbosValidationChannelAttribution {
  const metrics = compactMetrics({
    listingViews: result.listingViews,
    clicks: result.clicks,
    favorites: result.favorites,
    messages: result.messages,
    orders: result.orders ?? result.paidOrders ?? result.presaleOrders,
    revenue: result.revenue
  });
  const listingViews = numberMetric(metrics.listingViews);
  const clicks = numberMetric(metrics.clicks);
  const favorites = numberMetric(metrics.favorites);
  const messages = numberMetric(metrics.messages);
  const orders = numberMetric(metrics.orders);
  const refundCount = result.refundCount ?? 0;

  if (!hasPositiveMetric(metrics)) {
    return channelSummary(
      "marketplace_listing",
      "no_data",
      metrics,
      "No marketplace listing data recorded.",
      ["Record marketplace listing views, clicks, favorites, messages, orders, and revenue before judging this channel."]
    );
  }

  if (orders > 0 && refundCount > 0) {
    return channelSummary(
      "marketplace_listing",
      "refund_risk",
      metrics,
      "Marketplace produced orders, but refunds require follow-up.",
      ["Analyze refund reason, delivery expectation, and product description before scaling marketplace traffic."]
    );
  }

  if (orders > 0) {
    return channelSummary(
      "marketplace_listing",
      "converted",
      metrics,
      "Marketplace listing produced orders.",
      []
    );
  }

  if ((messages > 0 || clicks > 0 || favorites > 0) && orders === 0) {
    return channelSummary(
      "marketplace_listing",
      "engaged",
      metrics,
      messages > 0
        ? "Marketplace listing produced messages but no orders."
        : "Marketplace listing produced clicks or favorites but no orders.",
      ["Adjust offer, price, proof, and checkout path for marketplace visitors."]
    );
  }

  if (listingViews > 0) {
    return channelSummary(
      "marketplace_listing",
      "exposure_only",
      metrics,
      "Marketplace listing received exposure without clicks or messages.",
      ["Optimize marketplace title, cover, and CTA before judging demand."]
    );
  }

  return channelSummary(
    "marketplace_listing",
    "no_data",
    metrics,
    "No marketplace listing data recorded.",
    ["Record marketplace listing views, clicks, favorites, messages, orders, and revenue before judging this channel."]
  );
}

export function summarizeProductPageResults(
  result: EbosValidationResultInput
): EbosValidationChannelAttribution {
  const metrics = compactMetrics({
    productPageViews: result.productPageViews,
    productPageCtaClicks: result.productPageCtaClicks,
    ctaClicks: result.ctaClicks,
    leads: result.leads,
    paidOrders: result.paidOrders
  });
  const views = numberMetric(metrics.productPageViews);
  const productPageCtaClicks = numberMetric(metrics.productPageCtaClicks);
  const ctaClicks = numberMetric(metrics.ctaClicks);
  const clicks = Math.max(productPageCtaClicks, ctaClicks);
  const leads = numberMetric(metrics.leads);
  const paidOrders = numberMetric(metrics.paidOrders);
  const refundCount = result.refundCount ?? 0;

  if (!hasPositiveMetric(metrics)) {
    return channelSummary(
      "product_page",
      "no_data",
      metrics,
      "No product page data recorded.",
      ["Record product page views, CTA clicks, leads, and paid orders before judging this channel."]
    );
  }

  if (paidOrders > 0 && refundCount > 0) {
    return channelSummary(
      "product_page",
      "refund_risk",
      metrics,
      "Product page produced paid orders, but refunds require follow-up.",
      ["Analyze refund reason, delivery expectation, and product description before scaling product page traffic."]
    );
  }

  if (paidOrders > 0) {
    return channelSummary(
      "product_page",
      "converted",
      metrics,
      "Product page produced paid orders.",
      []
    );
  }

  if (clicks > 0 && leads === 0) {
    return channelSummary(
      "product_page",
      "engaged",
      metrics,
      "Product page CTA received clicks but no leads.",
      ["Optimize offer, price, trust elements, and consultation entry for product page visitors."]
    );
  }

  if (leads > 0 || clicks > 0) {
    return channelSummary(
      "product_page",
      "engaged",
      metrics,
      "Product page produced engagement signals.",
      []
    );
  }

  if (views > 0) {
    return channelSummary(
      "product_page",
      "exposure_only",
      metrics,
      "Product page received views without CTA clicks.",
      ["Optimize product page title, above-the-fold CTA, and trust elements."]
    );
  }

  return channelSummary(
    "product_page",
    "no_data",
    metrics,
    "No product page data recorded.",
    ["Record product page views, CTA clicks, leads, and paid orders before judging this channel."]
  );
}

export function summarizeManualOutreachResults(
  result: EbosValidationResultInput
): EbosValidationChannelAttribution {
  const metrics = compactMetrics({
    manualOutreachCount: result.manualOutreachCount ?? result.outreachCount,
    positiveReplies: result.positiveReplies,
    negativeReplies: result.negativeReplies,
    callsBooked: result.callsBooked,
    orders: result.orders
  });
  const outreachCount = numberMetric(metrics.manualOutreachCount);
  const positiveReplies = numberMetric(metrics.positiveReplies);
  const negativeReplies = numberMetric(metrics.negativeReplies);
  const callsBooked = numberMetric(metrics.callsBooked);
  const orders = numberMetric(metrics.orders);

  if (!hasPositiveMetric(metrics)) {
    return channelSummary(
      "manual_outreach",
      "no_data",
      metrics,
      "No manual outreach data recorded.",
      ["Record outreach count, replies, calls booked, and orders before judging this channel."]
    );
  }

  if (orders > 0) {
    return channelSummary(
      "manual_outreach",
      "converted",
      metrics,
      "Manual outreach produced orders.",
      []
    );
  }

  if (positiveReplies > 0 || negativeReplies > 0 || callsBooked > 0) {
    return channelSummary(
      "manual_outreach",
      "engaged",
      metrics,
      "Manual outreach produced replies or calls but no orders.",
      ["Adjust outreach pitch, audience segment, and follow-up offer."]
    );
  }

  if (outreachCount > 0) {
    return channelSummary(
      "manual_outreach",
      "exposure_only",
      metrics,
      "Manual outreach was sent without replies.",
      ["Improve outreach target list, opening line, and CTA."]
    );
  }

  return channelSummary(
    "manual_outreach",
    "no_data",
    metrics,
    "No manual outreach data recorded.",
    ["Record outreach count, replies, calls booked, and orders before judging this channel."]
  );
}

export function summarizePricingTestResults(
  result: EbosValidationResultInput
): EbosValidationChannelAttribution {
  const metrics = compactMetrics({
    priceShown: result.priceShown,
    ctaClicks: result.ctaClicks,
    paidOrders: result.paidOrders,
    refundCount: result.refundCount,
    feedback: result.feedback
  });
  const hasPriceShown = typeof metrics.priceShown === "string" && metrics.priceShown.trim().length > 0;
  const ctaClicks = numberMetric(metrics.ctaClicks);
  const paidOrders = numberMetric(metrics.paidOrders);
  const refundCount = numberMetric(metrics.refundCount);
  const hasFeedback = Array.isArray(metrics.feedback) && metrics.feedback.length > 0;

  if (!hasPositiveMetric(metrics) && !hasPriceShown && !hasFeedback) {
    return channelSummary(
      "pricing_test",
      "no_data",
      metrics,
      "No pricing test data recorded.",
      ["Record price shown, CTA clicks, paid orders, refunds, and pricing feedback before judging price."]
    );
  }

  if (paidOrders > 0 && refundCount > 0) {
    return channelSummary(
      "pricing_test",
      "refund_risk",
      metrics,
      "Pricing test produced paid orders, but refunds require follow-up.",
      ["Analyze refund reason, delivery expectation, product description, and price promise before scaling."]
    );
  }

  if (paidOrders > 0) {
    return channelSummary(
      "pricing_test",
      "converted",
      metrics,
      "Pricing test produced paid orders.",
      []
    );
  }

  if (ctaClicks > 0 || hasFeedback) {
    return channelSummary(
      "pricing_test",
      "engaged",
      metrics,
      "Pricing test produced clicks or feedback but no paid orders.",
      ["Adjust price framing, guarantee, and proof before judging willingness to pay."]
    );
  }

  return channelSummary(
    "pricing_test",
    "exposure_only",
    metrics,
    "Price was shown without purchase or feedback signals.",
    ["Record CTA clicks and direct pricing feedback after showing the price."]
  );
}

function channelSummary(
  channel: EbosValidationChannelAttribution["channel"],
  status: EbosValidationChannelAttribution["status"],
  metrics: Record<string, number | string | string[]>,
  summary: string,
  recommendations: string[]
): EbosValidationChannelAttribution {
  return {
    channel,
    status,
    metrics,
    summary,
    recommendations
  };
}

function compactMetrics(metrics: Record<string, number | string | string[] | undefined>) {
  return Object.fromEntries(
    Object.entries(metrics).filter(([, value]) => value !== undefined)
  ) as Record<string, number | string | string[]>;
}

function hasPositiveMetric(metrics: Record<string, number | string | string[]>) {
  return Object.values(metrics).some((value) => {
    if (typeof value === "number") return Number.isFinite(value) && value > 0;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return false;
  });
}

function numberMetric(value: number | string | string[] | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function unique(items: string[]) {
  return [...new Set(items.filter(Boolean))];
}
