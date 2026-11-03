"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  GEO_MONITORING_PROVIDERS,
  GEO_MONITORING_QUERIES,
  hasVerifiableEnheCitationEvidence,
  isConfiguredGeoProvider,
  isConfiguredGeoQuery
} from "@/lib/geo-monitoring";

const providerKeySchema = z.string().refine(isConfiguredGeoProvider, {
  message: "请选择预置 GEO 平台"
});
const queryTextSchema = z.string().refine(isConfiguredGeoQuery, {
  message: "请选择预置 GEO 查询"
});
const collectionStatusSchema = z.enum(["collected", "uncollected", "unavailable"]);

export async function recordGeoVisibilityResultAction(formData: FormData) {
  await requireAdmin();

  const queryText = queryTextSchema.parse(formData.get("queryText"));
  const providerKey = providerKeySchema.parse(formData.get("providerKey"));
  const collectionStatus = collectionStatusSchema.parse(
    formData.get("collectionStatus") ?? "collected"
  );
  const answerSummary = optionalText(formData.get("answerSummary"));
  const citedUrls = parseLines(formData.get("citedUrls")).filter((url) => /^https?:\/\//i.test(url));
  const competitors = parseLines(formData.get("competitors"));
  const isBrandMentioned = collectionStatus === "collected" && formData.get("isBrandMentioned") === "on";
  const screenshotUrl = optionalText(formData.get("screenshotUrl"));
  const isDomainCited = collectionStatus === "collected" && hasVerifiableEnheCitationEvidence({
    citedUrls,
    answerSummary,
    screenshotUrl
  });
  const sentiment = collectionStatus === "collected"
    ? optionalText(formData.get("sentiment"))
    : `geo:${collectionStatus}`;

  const queryIndex = GEO_MONITORING_QUERIES.findIndex((item) => item.query === queryText);
  const providerIndex = GEO_MONITORING_PROVIDERS.findIndex((item) => item.id === providerKey);
  const query = GEO_MONITORING_QUERIES[queryIndex];
  const provider = GEO_MONITORING_PROVIDERS[providerIndex];
  const queryKey = { query: query.query, locale: query.locale };

  await prisma.$transaction([
    prisma.geoQuery.createMany({
      data: {
        ...queryKey, intent: query.intent, topic: query.topic, targetPath: query.targetPath,
        tags: query.tags, sortOrder: queryIndex
      },
      skipDuplicates: true
    }),
    prisma.geoProvider.createMany({
      data: {
        providerKey, name: provider.name, region: provider.region, mode: provider.mode,
        officialUrl: provider.officialUrl, description: provider.description, sortOrder: providerIndex
      },
      skipDuplicates: true
    }),
    prisma.geoVisibilityResult.create({
      data: {
        queryText, providerKey,
        query: { connect: { query_locale: queryKey } },
        provider: { connect: { providerKey } },
        answerSummary, isBrandMentioned, isDomainCited, citedUrls, competitors, screenshotUrl, sentiment,
        checkedAt: new Date()
      }
    })
  ]);

  revalidatePath("/admin/geo-monitoring");
  redirect("/admin/geo-monitoring?saved=1");
}

function parseLines(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function optionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}
