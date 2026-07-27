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

export async function ensureGeoMonitoringDefaults() {
  await requireAdmin();

  try {
    await Promise.all([
      ...GEO_MONITORING_QUERIES.map((query, index) =>
        prisma.geoQuery.upsert({
          where: { query_locale: { query: query.query, locale: query.locale } },
          update: {
            intent: query.intent,
            topic: query.topic,
            targetPath: query.targetPath,
            tags: query.tags,
            status: "active",
            sortOrder: index
          },
          create: {
            query: query.query,
            locale: query.locale,
            intent: query.intent,
            topic: query.topic,
            targetPath: query.targetPath,
            tags: query.tags,
            status: "active",
            sortOrder: index
          }
        })
      ),
      ...GEO_MONITORING_PROVIDERS.map((provider, index) =>
        prisma.geoProvider.upsert({
          where: { providerKey: provider.id },
          update: {
            name: provider.name,
            region: provider.region,
            mode: provider.mode,
            officialUrl: provider.officialUrl,
            description: provider.description,
            status: "active",
            sortOrder: index
          },
          create: {
            providerKey: provider.id,
            name: provider.name,
            region: provider.region,
            mode: provider.mode,
            officialUrl: provider.officialUrl,
            description: provider.description,
            status: "active",
            sortOrder: index
          }
        })
      )
    ]);
  } catch (error) {
    console.error("[geo-monitoring] failed to sync defaults", error);
  }
}

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

  const [query, provider] = await Promise.all([
    prisma.geoQuery.findFirst({ where: { query: queryText }, select: { id: true } }),
    prisma.geoProvider.findUnique({ where: { providerKey }, select: { id: true } })
  ]);

  await prisma.geoVisibilityResult.create({
    data: {
      queryText,
      providerKey,
      queryId: query?.id,
      providerId: provider?.id,
      answerSummary,
      isBrandMentioned,
      isDomainCited,
      citedUrls,
      competitors,
      screenshotUrl,
      sentiment,
      checkedAt: new Date()
    }
  });

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
