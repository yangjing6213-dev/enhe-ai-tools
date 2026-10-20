"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAdminAuditLog } from "@/lib/admin-audit";
import { isAiWorkflowArchiveReady } from "@/lib/ai-workflows/rules";
import { getAiWorkflowCosConfig } from "@/lib/ai-workflows/cos";

function parseTopicRows(value: FormDataEntryValue | null) {
  const rows = String(value ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const parts = line.split("|").map((part) => part.trim());
    const [name = "", second = "", third = ""] = parts;
    if (parts.length > 3) throw new Error("每行最多填写主题名称、英文名称和搜索方向三项。");
    const hasEnglishAndDirections = parts.length === 3;
    const englishName = hasEnglishAndDirections ? second : "";
    const searchDirections = hasEnglishAndDirections ? third : second;
    if (!name || name.length > 120 || englishName.length > 120 || searchDirections.length > 500) {
      throw new Error("每行主题名称和英文名称最多 120 个字符，搜索方向最多 500 个字符。");
    }
    return { name, englishName: englishName || null, searchDirections };
  });
  if (rows.length > 100) throw new Error("主题列表最多支持 100 项。");
  if (rows.length && new Set(rows.map((row) => row.name.toLocaleLowerCase())).size !== rows.length) throw new Error("主题名称不能重复。");
  return rows;
}

function getShanghaiDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (key: string) => parts.find((part) => part.type === key)?.value ?? "";
  return new Date(`${value("year")}-${value("month")}-${value("day")}T00:00:00.000Z`);
}

function setNotice(key: string) {
  revalidatePath("/admin/ai-workflows");
  redirect(`/admin/ai-workflows?${key}=1`);
}

export async function saveAiWorkflowTopicsAction(formData: FormData) {
  const admin = await requireAdmin();
  const topicListConfirmed = formData.get("topicListConfirmed") === "on";
  let rows: ReturnType<typeof parseTopicRows>;
  try { rows = parseTopicRows(formData.get("topics")); }
  catch (error) { redirect(`/admin/ai-workflows?error=${encodeURIComponent(error instanceof Error ? error.message : "主题格式有误。")}`); }
  if (topicListConfirmed && rows.length === 0) redirect("/admin/ai-workflows?error=不能确认空主题清单。");

  await prisma.$transaction(async (tx) => {
    const currentSetting = await tx.aiWorkflowCollectionSetting.findUnique({ where: { id: "default" }, select: { topicListVersion: true } });
    const topicListVersion = (currentSetting?.topicListVersion ?? 0) + 1;
    const now = new Date();
    await tx.aiWorkflowTopic.updateMany({ where: { isEnabled: true }, data: { isEnabled: false } });
    for (const [index, row] of rows.entries()) {
      const slug = `topic-${createHash("sha256").update(row.name).digest("hex").slice(0, 20)}`;
      await tx.aiWorkflowTopic.upsert({
        where: { slug },
        update: { name: row.name, englishName: row.englishName, searchDirections: row.searchDirections, sortOrder: index, isEnabled: true },
        create: { slug, name: row.name, englishName: row.englishName, searchDirections: row.searchDirections, sortOrder: index, isEnabled: true },
      });
    }
    await tx.aiWorkflowCollectionSetting.upsert({
      where: { id: "default" },
      update: { topicListVersion, topicListConfirmedAt: topicListConfirmed ? now : null, isEnabled: false },
      create: { id: "default", topicListVersion, topicListConfirmedAt: topicListConfirmed ? now : null, isEnabled: false },
    });
    await tx.aiWorkflowBatch.updateMany({
      where: { status: { in: ["queued", "paused", "running"] } },
      data: {
        status: "failed",
        failureReason: "topic_list_changed",
        completedAt: now,
        leaseOwnerId: null,
        leaseTokenHash: null,
        leaseExpiresAt: null,
        lastWorkerStage: "topic_list_changed",
      },
    });
  });
  await writeAdminAuditLog({ adminId: admin.id, action: "ai_workflow.topics.update", targetType: "ai_workflow_topics", summary: "Updated the ordered AI Workflow topic list.", metadata: { topicCount: rows.length, topicListConfirmed } });
  setNotice("topicsSaved");
}

export async function saveAiWorkflowScheduleAction(formData: FormData) {
  const admin = await requireAdmin();
  const scheduleTime = String(formData.get("scheduleTime") ?? "09:00").trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(scheduleTime)) redirect("/admin/ai-workflows?error=时间格式应为%20HH:mm");
  const isPaused = formData.get("isPaused") === "on";
  const requestedEnabled = formData.get("isEnabled") === "on";
  const [topicCount, setting] = await Promise.all([
    prisma.aiWorkflowTopic.count({ where: { isEnabled: true } }),
    prisma.aiWorkflowCollectionSetting.findUnique({ where: { id: "default" }, select: { scheduledTaskRegisteredAt: true, scheduledTaskEnabledAt: true, topicListConfirmedAt: true } }),
  ]);
  const workerCredentialAvailable = Boolean(process.env.AI_WORKFLOW_WORKER_TOKEN?.trim());
  const cosConfig = getAiWorkflowCosConfig();
  const cosServerConfigured = Boolean(cosConfig && cosConfig.region === "ap-shanghai" && cosConfig.staticBucket === "enhe-static-1303691623" && cosConfig.downloadBucket === "enhe-downloads-1303691623");
  const scheduledTaskReady = Boolean(setting?.scheduledTaskRegisteredAt && setting?.scheduledTaskEnabledAt);
  const topicListConfirmed = Boolean(setting?.topicListConfirmedAt);
  const isEnabled = requestedEnabled && topicListConfirmed && topicCount > 0 && workerCredentialAvailable && cosServerConfigured && scheduledTaskReady;
  await prisma.aiWorkflowCollectionSetting.upsert({
    where: { id: "default" },
    update: { scheduleTime, timeZone: "Asia/Shanghai", isPaused, isEnabled },
    create: { id: "default", scheduleTime, timeZone: "Asia/Shanghai", isPaused, isEnabled },
  });
  await writeAdminAuditLog({ adminId: admin.id, action: "ai_workflow.schedule.update", targetType: "ai_workflow_collection_setting", summary: "Updated the AI Workflow collection schedule.", metadata: { scheduleTime, isPaused, isEnabled, topicCount, topicListConfirmed, workerCredentialAvailable, cosServerConfigured, scheduledTaskReady } });
  setNotice(requestedEnabled && !isEnabled ? "scheduleNotReady" : "scheduleSaved");
}

export async function requestAiWorkflowBatchAction() {
  const admin = await requireAdmin();
  const [setting, topics] = await Promise.all([
    prisma.aiWorkflowCollectionSetting.findUnique({ where: { id: "default" } }),
    prisma.aiWorkflowTopic.findMany({ where: { isEnabled: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  if (setting?.isPaused) redirect("/admin/ai-workflows?error=采集已暂停，恢复后才能请求批次。");
  if (!setting?.topicListConfirmedAt) redirect("/admin/ai-workflows?error=请先导入并核对已提供的有序主题清单。");
  if (!topics.length) redirect("/admin/ai-workflows?error=尚未导入有序主题清单。");
  const cosConfig = getAiWorkflowCosConfig();
  const cosServerConfigured = Boolean(cosConfig && cosConfig.region === "ap-shanghai" && cosConfig.staticBucket === "enhe-static-1303691623" && cosConfig.downloadBucket === "enhe-downloads-1303691623");
  if (!process.env.AI_WORKFLOW_WORKER_TOKEN?.trim() || !cosServerConfigured) redirect("/admin/ai-workflows?error=执行凭据或服务器文件存储未就绪，暂不能请求批次。");

  const batchDate = getShanghaiDate();
  const [existing, alreadyUsedToday, activeBatch] = await Promise.all([
    prisma.aiWorkflowBatch.findUnique({ where: { batchDate }, select: { id: true } }),
    prisma.aiWorkflowBatch.findFirst({ where: { lastRunDate: batchDate }, select: { id: true } }),
    prisma.aiWorkflowBatch.findFirst({ where: { status: { in: ["queued", "paused", "running"] } }, select: { id: true } }),
  ]);
  if (existing) redirect("/admin/ai-workflows?batchExists=1");
  if (alreadyUsedToday) redirect("/admin/ai-workflows?dailyQuotaUsed=1");
  if (activeBatch) redirect("/admin/ai-workflows?batchInProgress=1");
  const topicOrderVersion = setting?.topicListVersion ?? 0;
  const previousBatches = await prisma.aiWorkflowBatch.count({ where: { batchDate: { lt: batchDate }, topicOrderVersion } });
  const topic = topics[previousBatches % topics.length]!;
  try {
    const batch = await prisma.aiWorkflowBatch.create({ data: {
      batchDate,
      topicId: topic.id,
      topicNameSnapshot: topic.name,
      topicSearchDirectionsSnapshot: topic.searchDirections,
      topicOrderVersion,
      triggerType: "manual",
      status: "queued",
    } });
    await writeAdminAuditLog({ adminId: admin.id, action: "ai_workflow.batch.request", targetType: "ai_workflow_batch", targetId: batch.id, summary: "Queued a manual AI Workflow collection batch.", metadata: { topicId: topic.id, topicOrderVersion: setting?.topicListVersion ?? 0 } });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
  }
  setNotice("batchQueued");
}

export async function decideAiWorkflowPriceAction(formData: FormData) {
  const admin = await requireAdmin();
  const candidateId = String(formData.get("candidateId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const candidate = await prisma.aiWorkflowCandidate.findUnique({ where: { id: candidateId }, include: { tool: true, file: true } });
  if (!candidate || !candidate.toolId || !candidate.tool || candidate.status !== "pending_pricing") redirect("/admin/ai-workflows?error=候选项目状态已变化，请刷新后重试。");
  if (decision === "reject") {
    await prisma.$transaction([
      prisma.aiWorkflowCandidate.update({ where: { id: candidate.id }, data: { status: "rejected" } }),
      prisma.tool.update({ where: { id: candidate.toolId }, data: { status: "offline" } }),
    ]);
    await writeAdminAuditLog({ adminId: admin.id, action: "ai_workflow.candidate.reject", targetType: "ai_workflow_candidate", targetId: candidate.id, summary: "Rejected an AI Workflow candidate.", metadata: { repositoryId: candidate.repositoryId } });
    setNotice("candidateRejected");
  }

  const priceDecision = decision === "paid" ? "paid" : decision === "free" ? "free" : null;
  if (!priceDecision) redirect("/admin/ai-workflows?error=价格选择无效。");
  const price = priceDecision === "paid" ? Number(formData.get("confirmedPrice")) : 0;
  if (priceDecision === "paid" && (!Number.isFinite(price) || price < 10 || price > 50 || Math.round(price * 100) !== price * 100)) redirect("/admin/ai-workflows?error=收费价格必须为 10 到 50 元，最多两位小数。");
  const downloadBucket = process.env.COS_DOWNLOAD_BUCKET?.trim() || "enhe-downloads-1303691623";
  const canPublish = Boolean(candidate.file && isAiWorkflowArchiveReady({
    repositoryId: candidate.repositoryId,
    commitSha: candidate.commitSha,
    sourceFingerprint: candidate.sourceFingerprint,
    licenseSpdx: candidate.licenseSpdx,
    candidateFileId: candidate.fileId,
    toolFileId: candidate.tool.downloadFileId,
    packageVersion: candidate.packageVersion,
    packageSize: candidate.packageSize,
    packageSha256: candidate.packageSha256,
    validationReport: candidate.validationReport,
    productName: candidate.tool.name,
    productDescription: candidate.tool.shortDescription,
    productContent: candidate.tool.content,
    verifiedEnvironments: candidate.verifiedEnvironments,
    fileId: candidate.file?.id ?? null,
    filePath: candidate.file?.filePath ?? null,
    fileName: candidate.file?.fileName ?? null,
    fileMimeType: candidate.file?.mimeType ?? null,
    fileStorageBucket: candidate.file?.storageBucket ?? null,
    fileObjectKey: candidate.file?.objectKey ?? null,
    fileSize: candidate.file?.fileSize ?? null,
    fileSha256: candidate.file?.sha256 ?? null,
    fileVersion: candidate.file?.version ?? null,
    expectedDownloadBucket: downloadBucket,
  }));
  await prisma.$transaction(async (tx) => {
    await tx.aiWorkflowCandidate.update({ where: { id: candidate.id }, data: {
      priceDecision,
      confirmedPrice: price,
      pricingApproverId: admin.id,
      pricingApprovedAt: new Date(),
      ...(canPublish ? { status: "published" } : {}),
    } });
    if (canPublish) {
      await tx.tool.update({ where: { id: candidate.toolId! }, data: {
        status: "published",
        downloadFileId: candidate.fileId,
        isDownloadPaid: priceDecision === "paid",
        isDownloadLinkVipOnly: priceDecision === "paid",
        downloadPrice: price,
      } });
    }
  });
  await writeAdminAuditLog({ adminId: admin.id, action: "ai_workflow.price.confirm", targetType: "ai_workflow_candidate", targetId: candidate.id, summary: canPublish ? "Confirmed workflow pricing and published the verified package." : "Recorded workflow pricing; publication remains pending until delivery gates pass.", metadata: { decision: priceDecision, amount: price, canPublish } });
  setNotice(canPublish ? "priceConfirmed" : "priceSavedPendingArchive");
}
