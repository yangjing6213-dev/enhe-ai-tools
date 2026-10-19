import Link from "next/link";
import { AdminContentShell } from "@/app/admin/admin-ui";
import { getCurrentLocale } from "@/lib/i18n";
import { prisma } from "@/lib/db";
import { getAiWorkflowCosConfig } from "@/lib/ai-workflows/cos";
import {
  decideAiWorkflowPriceAction,
  requestAiWorkflowBatchAction,
  saveAiWorkflowScheduleAction,
  saveAiWorkflowTopicsAction,
} from "@/app/admin/ai-workflows/actions";

function rationaleLines(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const copy: Record<string, string> = {
    targetUsers: "适合人群", problem: "解决的问题", deliverables: "网站交付内容", verification: "验证与适配", difficulty: "使用门槛", externalCosts: "额外费用", reason: "建议价格理由",
  };
  return Object.entries(copy).flatMap(([key, label]) => {
    const item = (value as Record<string, unknown>)[key];
    return typeof item === "string" && item.trim() ? [{ label, value: item.trim().slice(0, 1200) }] : [];
  });
}

function statusText(status: string, english: boolean) {
  const zh: Record<string, string> = { queued: "等待执行端", running: "执行中", completed: "完成", partial: "部分完成", failed: "失败", paused: "暂停", pending_pricing: "待确认价格", published: "已发布", validated: "验证通过", discovered: "已发现", downloading: "下载中", reviewing: "核验中", rejected: "已拒绝" };
  const en: Record<string, string> = { queued: "Waiting for worker", running: "Running", completed: "Complete", partial: "Partial", failed: "Failed", paused: "Paused", pending_pricing: "Price approval", published: "Published", validated: "Validated", discovered: "Discovered", downloading: "Downloading", reviewing: "Reviewing", rejected: "Rejected" };
  return (english ? en : zh)[status] ?? status;
}

function validationSummary(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "尚无验证摘要。";
  const validation = (value as Record<string, unknown>).validation;
  if (!validation || typeof validation !== "object" || Array.isArray(validation)) return "尚无验证摘要。";
  const summary = (validation as Record<string, unknown>).summary;
  return typeof summary === "string" ? summary.slice(0, 1000) : "尚无验证摘要。";
}

export default async function AdminAiWorkflowsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [params, locale, setting, topics, batches, candidates, tools] = await Promise.all([
    searchParams,
    getCurrentLocale(),
    prisma.aiWorkflowCollectionSetting.findUnique({ where: { id: "default" } }),
    prisma.aiWorkflowTopic.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.aiWorkflowBatch.findMany({ take: 10, orderBy: { batchDate: "desc" }, include: { topic: true, _count: { select: { candidates: true } } } }),
    prisma.aiWorkflowCandidate.findMany({ where: { status: "pending_pricing" }, orderBy: { createdAt: "asc" }, include: { topic: true, file: true, tool: true } }),
    prisma.tool.findMany({ where: { type: "ai_workflow" }, orderBy: [{ updatedAt: "desc" }], take: 100, include: { aiWorkflowCandidate: true } }),
  ]);
  const english = locale === "en";
  const serverCosConfig = getAiWorkflowCosConfig();
  const serverCosReady = Boolean(serverCosConfig && serverCosConfig.region === "ap-shanghai" && serverCosConfig.staticBucket === "enhe-static-1303691623" && serverCosConfig.downloadBucket === "enhe-downloads-1303691623");
  const activeTopics = topics.filter((topic) => topic.isEnabled);
  const schedule = setting?.scheduleTime ?? "09:00";
  const state = setting?.isPaused ? (english ? "Paused" : "已暂停") : setting?.isEnabled ? (english ? "Enabled" : "已启用") : (english ? "Not configured" : "未就绪");
  const text = english ? {
    title: "AI Workflows", intro: "Manage the ordered collection topics, local worker schedule, batches, draft products, and price approvals.",
    topics: "Ordered collection topics", topicHint: "Copy the exact ordered list from attachment 2. The ten page directions are categories, not collection topics. Check the box only after verifying every item and its order.", confirmTopics: "I verified this list against attachment 2",
    saveTopics: "Save topic order", schedule: "Collection schedule", time: "Daily time (Asia/Shanghai)", paused: "Pause worker requests", enabled: "Enable daily collection", saveSchedule: "Save schedule", request: "Queue today’s batch", worker: "Worker heartbeat", workerNotSeen: "No successful worker poll has been recorded.", token: "Server worker credential", tokenReady: "Present", tokenMissing: "Missing", topicMissing: "The ordered topic list has not been received and verified; real collection stays disabled.",
    pricing: "Price approval queue", noCandidates: "No candidate is waiting for price approval.", source: "Source repository", version: "Package", size: "Size", sha: "SHA-256", suggestion: "Suggested price", confirmPaid: "Confirm paid price", setFree: "Explicitly set as free", reject: "Reject candidate", rationale: "Pricing notes", archivePending: "A price can be recorded, but publication remains blocked until the archived file, validation, license, source version, and product copy are all present.",
    serverCos: "Server COS credentials", cosReady: "Configured", cosMissing: "Missing", schedulerRegistered: "Windows task registered", schedulerEnabled: "Windows task enabled", firstAutomatic: "First unattended success", lastSuccessful: "Last successful run", stage: "Last stage", heartbeat: "Last heartbeat", failure: "Failure details", trigger: "Started by", fileState: "Archive", fileReady: "Private package verified", fileMissing: "Not available", license: "License", environments: "Verified environments", validation: "Validation result", scheduleBlocked: "Daily collection needs the verified attachment 2 topic list, worker credential, server COS configuration, and registered Windows task.",
    batches: "Recent batches", noBatches: "No batch records yet.", batchDate: "Date", topicLabel: "Topic", candidateCount: "Candidates", products: "Workflow products", newProduct: "New draft", noProducts: "No workflow product records.", edit: "Edit", productStatus: "Status", created: "Updated", notice: "Saved.", dailyQuotaMessage: "This local calendar day already used its one-batch limit.", batchActiveMessage: "A queued or running batch already exists; it will be resumed or completed first.", batchExistsMessage: "A batch for today already exists.",
  } : {
    title: "AI 工作流管理", intro: "管理有序采集主题、本机执行端调度、每日批次、商品草稿和待确认价格。",
    topics: "有序采集主题", topicHint: "请先按附件2逐项导入并核对主题及顺序。页面上的十个方向只是分类，不是采集主题。只有确认每项和顺序完全一致后才勾选。", confirmTopics: "我已按附件2核对当前主题内容和顺序",
    saveTopics: "保存主题顺序", schedule: "采集调度", time: "每日时间（北京时间）", paused: "暂停执行请求", enabled: "启用每日采集", saveSchedule: "保存调度设置", request: "请求今天的批次", worker: "执行端心跳", workerNotSeen: "尚无成功的执行端检查记录。", token: "服务端执行凭据", tokenReady: "已配置", tokenMissing: "未配置", topicMissing: "尚未收到并核验附件2中的有序主题清单，真实采集保持关闭。",
    pricing: "待确认价格", noCandidates: "当前没有等待价格确认的候选项目。", source: "来源仓库", version: "交付包版本", size: "大小", sha: "SHA-256", suggestion: "建议价格", confirmPaid: "确认收费价格", setFree: "明确设为免费", reject: "拒绝该项目", rationale: "定价依据", archivePending: "价格可以先记录；只有交付包、验证、许可证、固定来源版本和商品说明齐备后才会上架。",
    serverCos: "服务器 COS 配置", cosReady: "已配置", cosMissing: "未配置", schedulerRegistered: "Windows 定时任务已注册", schedulerEnabled: "Windows 定时任务已启用", firstAutomatic: "首次无人值守成功", lastSuccessful: "最近成功时间", stage: "最近执行阶段", heartbeat: "最近心跳", failure: "失败原因", trigger: "触发方式", fileState: "交付包", fileReady: "私有交付包已核验", fileMissing: "未就绪", license: "许可证", environments: "已验证环境", validation: "验证结果", scheduleBlocked: "附件2主题顺序、执行凭据、服务器 COS 配置和 Windows 定时任务都准备好之前，不能启用每日采集。",
    batches: "最近批次", noBatches: "还没有批次记录。", batchDate: "日期", topicLabel: "主题", candidateCount: "候选数", products: "工作流商品", newProduct: "新增草稿", noProducts: "还没有工作流商品记录。", edit: "编辑", productStatus: "状态", created: "更新时间", notice: "已保存。", dailyQuotaMessage: "今天的批次额度已经使用，最多每天推进一个主题。", batchActiveMessage: "已有等待或正在执行的批次，会先恢复或完成它。", batchExistsMessage: "今天已经有一个批次。",
  };

  return <AdminContentShell>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-3xl font-semibold text-white">{text.title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#8B95A7]">{text.intro}</p></div>
      <Link href="/admin/ai-workflows/new" className="rounded-lg bg-[#1769C2] px-4 py-2 text-sm font-semibold text-white">{text.newProduct}</Link>
    </div>
    {params.error ? <p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">{params.error}</p> : params.topicsSaved || params.scheduleSaved || params.batchQueued || params.priceConfirmed || params.candidateRejected ? <p role="status" className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">{text.notice}</p> : null}
    {params.dailyQuotaUsed || params.batchInProgress || params.batchExists ? <p role="status" className="mt-5 rounded-xl border border-sky-400/30 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">{params.dailyQuotaUsed ? text.dailyQuotaMessage : params.batchInProgress ? text.batchActiveMessage : text.batchExistsMessage}</p> : null}
    {params.scheduleNotReady ? <p role="status" className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">{text.scheduleBlocked}</p> : null}
    {params.priceSavedPendingArchive ? <p role="status" className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">{text.archivePending}</p> : null}
    {!activeTopics.length ? <p className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">{text.topicMissing}</p> : null}

    <section className="mt-8 grid gap-5 xl:grid-cols-2">
      <form action={saveAiWorkflowTopicsAction} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-xl font-semibold text-white">{text.topics}</h2><p className="mt-2 text-sm leading-6 text-[#9CAABD]">{text.topicHint}</p>
        <textarea name="topics" rows={8} defaultValue={topics.map((topic) => `${topic.name}${topic.englishName ? ` | ${topic.englishName}` : ""}`).join("\n")} className="mt-4 w-full rounded-xl border border-white/10 bg-[#0b1424] p-3 text-sm text-white" />
        <label className="mt-3 flex gap-2 text-sm leading-6 text-[#D7E0EB]"><input type="checkbox" name="topicListConfirmed" />{text.confirmTopics}</label>
        <button className="mt-3 rounded-lg border border-white/20 px-4 py-2 text-sm text-white">{text.saveTopics}</button>
      </form>
      <div className="grid gap-5">
        <form action={saveAiWorkflowScheduleAction} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-semibold text-white">{text.schedule}</h2><p className="mt-2 text-sm text-[#9CAABD]">{state}</p></div><span className="rounded-full border border-white/15 px-3 py-1 text-xs text-[#9CAABD]">{text.worker}: {setting?.lastWorkerSeenAt?.toLocaleString(locale === "en" ? "en-US" : "zh-CN") ?? text.workerNotSeen}</span></div>
          <label className="mt-4 block text-sm text-white">{text.time}<input name="scheduleTime" type="time" required defaultValue={schedule} className="mt-2 block rounded-lg border border-white/15 bg-[#0b1424] px-3 py-2 text-white" /></label>
          <div className="mt-4 grid gap-2 text-sm text-[#D7E0EB]"><label className="flex gap-2"><input type="checkbox" name="isPaused" defaultChecked={setting?.isPaused ?? false} />{text.paused}</label><label className="flex gap-2"><input type="checkbox" name="isEnabled" defaultChecked={setting?.isEnabled ?? false} />{text.enabled}</label></div>
          <div className="mt-3 grid gap-1 text-xs text-[#9CAABD]">
            <p>{text.token}: {process.env.AI_WORKFLOW_WORKER_TOKEN?.trim() ? text.tokenReady : text.tokenMissing}</p>
            <p>{text.serverCos}: {serverCosReady ? text.cosReady : text.cosMissing}</p>
            <p>{text.schedulerRegistered}: {setting?.scheduledTaskRegisteredAt?.toLocaleString(locale === "en" ? "en-US" : "zh-CN") ?? text.cosMissing}</p>
            <p>{text.schedulerEnabled}: {setting?.scheduledTaskEnabledAt?.toLocaleString(locale === "en" ? "en-US" : "zh-CN") ?? text.cosMissing}</p>
            <p>{text.firstAutomatic}: {setting?.firstUnattendedSuccessAt?.toLocaleString(locale === "en" ? "en-US" : "zh-CN") ?? "—"}</p>
            <p>{text.lastSuccessful}: {setting?.lastSuccessfulRunAt?.toLocaleString(locale === "en" ? "en-US" : "zh-CN") ?? "—"}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3"><button className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white">{text.saveSchedule}</button><button formAction={requestAiWorkflowBatchAction} className="rounded-lg bg-[#1769C2] px-4 py-2 text-sm font-semibold text-white">{text.request}</button></div>
        </form>
      </div>
    </section>

    <section className="mt-9">
      <h2 className="text-2xl font-semibold text-white">{text.pricing}</h2>
      {candidates.length ? <div className="mt-4 grid gap-4">{candidates.map((candidate) => <article key={candidate.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-semibold text-white">{candidate.tool?.name ?? candidate.repositoryName}</h3><p className="mt-1 text-sm text-[#9CAABD]">{text.source}: <a href={candidate.repositoryUrl} target="_blank" rel="noreferrer" className="text-sky-300 underline">{candidate.repositoryOwner}/{candidate.repositoryName}</a></p></div><span className="rounded-full border border-amber-300/30 px-3 py-1 text-xs text-amber-200">{statusText(candidate.status, english)}</span></div>
        <p className="mt-3 text-sm leading-6 text-[#D7E0EB]">{candidate.tool?.shortDescription ?? "尚无商品简介。"}</p>
        <p className="mt-2 text-xs text-[#9CAABD]">{text.license}: {candidate.licenseSpdx ?? "—"} · {text.environments}: {candidate.verifiedEnvironments.length ? candidate.verifiedEnvironments.join("、") : "—"} · {text.fileState}: {candidate.file && candidate.packageSha256 ? text.fileReady : text.fileMissing}</p>
        <p className="mt-1 text-xs leading-5 text-[#9CAABD]">{text.validation}: {validationSummary(candidate.validationReport)}</p>
        <p className="mt-3 text-sm text-[#D7E0EB]">{text.version}: {candidate.packageVersion ?? "-"} · {text.size}: {candidate.packageSize ? `${(Number(candidate.packageSize) / 1024 / 1024).toFixed(1)} MB` : "-"}</p>
        <p className="mt-1 break-all text-xs text-[#9CAABD]">{text.sha}: {candidate.packageSha256 ?? "-"}</p>
        <div className="mt-4 rounded-xl bg-[#0b1424] p-4"><h4 className="text-sm font-semibold text-white">{text.rationale}</h4>{rationaleLines(candidate.priceRationale).length ? rationaleLines(candidate.priceRationale).map((line) => <p key={line.label} className="mt-2 text-sm leading-6 text-[#B8C4D4]"><strong>{line.label}：</strong>{line.value}</p>) : <p className="mt-2 text-sm text-[#9CAABD]">尚未生成可审核的定价依据。</p>}</div>
        <form action={decideAiWorkflowPriceAction} className="mt-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="candidateId" value={candidate.id} />
          <label className="grid gap-1 text-xs text-[#9CAABD]">{text.suggestion}<input name="confirmedPrice" type="number" min="10" max="50" step="0.01" defaultValue={candidate.priceSuggestion ? Number(candidate.priceSuggestion).toFixed(2) : "19.00"} className="w-32 rounded-lg border border-white/15 bg-[#0b1424] px-3 py-2 text-sm text-white" /></label>
          <button name="decision" value="paid" className="rounded-lg bg-[#1769C2] px-4 py-2 text-sm font-semibold text-white">{text.confirmPaid}</button>
          <button name="decision" value="free" className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white">{text.setFree}</button>
          <button name="decision" value="reject" className="rounded-lg border border-red-300/40 px-4 py-2 text-sm text-red-200">{text.reject}</button>
        </form>
      </article>)}</div> : <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-[#9CAABD]">{text.noCandidates}</p>}
    </section>

    <section className="mt-9">
      <h2 className="text-2xl font-semibold text-white">{text.batches}</h2>
      {batches.length ? <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-white/[0.04] text-[#9CAABD]"><tr><th className="p-3">{text.batchDate}</th><th className="p-3">{text.topicLabel}</th><th className="p-3">{text.trigger}</th><th className="p-3">{text.productStatus}</th><th className="p-3">{text.stage}</th><th className="p-3">{text.heartbeat}</th><th className="p-3">{text.candidateCount}</th><th className="p-3">{text.failure}</th></tr></thead><tbody>{batches.map((batch) => <tr key={batch.id} className="border-t border-white/10 text-white"><td className="p-3">{batch.batchDate.toISOString().slice(0, 10)}</td><td className="p-3">{batch.topicNameSnapshot}</td><td className="p-3">{batch.triggerType === "manual" ? (english ? "Manual" : "手动") : (english ? "Scheduled" : "定时")}</td><td className="p-3">{statusText(batch.status, english)}</td><td className="p-3">{batch.lastWorkerStage ?? "—"}</td><td className="p-3">{batch.lastHeartbeatAt?.toLocaleString(locale === "en" ? "en-US" : "zh-CN") ?? "—"}</td><td className="p-3">{batch._count.candidates}</td><td className="p-3">{batch.failureReason ?? "—"}</td></tr>)}</tbody></table></div> : <p className="mt-3 text-sm text-[#9CAABD]">{text.noBatches}</p>}
    </section>

    <section className="mt-9">
      <h2 className="text-2xl font-semibold text-white">{text.products}</h2>
      {tools.length ? <div className="mt-4 grid gap-3">{tools.map((tool) => <article key={tool.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4"><div><h3 className="font-semibold text-white">{tool.name}</h3><p className="mt-1 text-xs text-[#9CAABD]">{tool.slug} · {text.productStatus}: {statusText(tool.status, english)} · {text.created}: {tool.updatedAt.toLocaleString(locale === "en" ? "en-US" : "zh-CN")}</p></div><Link href={`/admin/ai-workflows/${tool.id}`} className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white">{text.edit}</Link></article>)}</div> : <p className="mt-3 text-sm text-[#9CAABD]">{text.noProducts}</p>}
    </section>
  </AdminContentShell>;
}
