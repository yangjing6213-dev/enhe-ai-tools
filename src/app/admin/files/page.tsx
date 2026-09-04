import { prisma } from "@/lib/db";
import { deleteFileAdminAction, upsertFileAction } from "@/app/admin/actions";
import { AdminSection, Field, inputClass, selectClass, SubmitButton } from "@/app/admin/admin-ui";
import { buildAdminFilePageHref, buildAdminFileWhere, parseAdminFileListParams } from "@/lib/admin-list";
import { getStorageDiagnostics } from "@/lib/storage-diagnostics";
import { parseCosFilePath } from "@/lib/storage";
import { AdminFileUploadForm } from "@/app/admin/files/upload-progress-form";
import Link from "next/link";

export default async function AdminFilesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const filters = parseAdminFileListParams(params);
  const where = buildAdminFileWhere(filters);
  const [files, total, tools] = await Promise.all([
    prisma.file.findMany({
      where,
      include: { tool: true, primaryFor: true },
      orderBy: { createdAt: "desc" },
      skip: filters.skip,
      take: filters.take
    }),
    prisma.file.count({ where }),
    prisma.tool.findMany({ orderBy: { name: "asc" } })
  ]);
  const storageDiagnostics = getStorageDiagnostics();
  const pageCount = Math.max(1, Math.ceil(total / filters.pageSize));

  return (
    <AdminSection title="文件管理" intro="上传后会自动创建文件记录；配置腾讯云 COS 环境变量后会上传到 COS，否则落到本地 uploads 目录。">
      {params.uploaded ? (
        <p className="mb-5 rounded-xl border border-[#48F5D3]/30 bg-[#48F5D3]/10 px-4 py-3 text-sm text-[#48F5D3]">
          上传成功，已自动创建文件记录。
        </p>
      ) : null}
      {params.deleted ? (
        <p className="mb-5 rounded-xl border border-[#48F5D3]/30 bg-[#48F5D3]/10 px-4 py-3 text-sm text-[#48F5D3]">
          文件已删除，并已清理相关下载绑定。
        </p>
      ) : null}
      {params.error ? (
        <p className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          操作失败：{params.error}
        </p>
      ) : null}
      {params.warning ? (
        <p className="mb-5 rounded-xl border border-[#FFB86B]/30 bg-[#FFB86B]/10 px-4 py-3 text-sm text-[#FFB86B]">
          {params.warning}
        </p>
      ) : null}

      <div className="glass mb-8 grid gap-4 rounded-2xl p-6 md:grid-cols-4">
        <div>
          <p className="text-xs text-[#8B95A7]">当前存储模式</p>
          <p className="mt-2 text-lg font-semibold text-[#E8EEF8]">{storageDiagnostics.mode === "cos" ? "腾讯云 COS" : "本地 uploads"}</p>
        </div>
        <div>
          <p className="text-xs text-[#8B95A7]">COS 配置状态</p>
          <p className={storageDiagnostics.cosConfigured ? "mt-2 text-lg font-semibold text-[#48F5D3]" : "mt-2 text-lg font-semibold text-[#FFB86B]"}>
            {storageDiagnostics.cosConfigured ? "已启用" : "未完整配置"}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#8B95A7]">Bucket / Region</p>
          <p className="mt-2 text-sm text-[#E8EEF8]">{storageDiagnostics.bucket ?? "-"} / {storageDiagnostics.region ?? "-"}</p>
          <p className="mt-1 text-xs text-[#8B95A7]">SecretId: {storageDiagnostics.secretIdPreview ?? "-"}</p>
        </div>
        <div>
          <p className="text-xs text-[#8B95A7]">签名下载有效期</p>
          <p className="mt-2 text-lg font-semibold text-[#E8EEF8]">{storageDiagnostics.signedUrlExpiresSeconds} 秒</p>
        </div>
        {!storageDiagnostics.cosConfigured ? (
          <div className="md:col-span-4 rounded-xl border border-[#FFB86B]/30 bg-[#FFB86B]/10 px-4 py-3 text-sm text-[#FFD6A5]">
            COS 未启用，缺少：{storageDiagnostics.missingCosEnvKeys.join("、") || "无"}。未配置完整时会自动保存到本地 uploads。
          </div>
        ) : null}
        <div className="md:col-span-4">
          <p className="text-xs text-[#8B95A7]">上传白名单</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {storageDiagnostics.allowedExtensions.map((extension) => (
              <span key={extension} className="rounded-full border border-white/10 px-2 py-1 text-xs text-[#8B95A7]">
                {extension}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="glass mb-8 rounded-2xl p-6">
        <h2 className="text-xl font-semibold">上传文件</h2>
        <AdminFileUploadForm />
        <p className="mt-3 text-xs text-[#8B95A7]">推荐软件安装包命名包含工具名和版本号。COS 环境变量完整时自动使用 COS。</p>
      </div>

      <FileForm tools={tools} />

      <form className="glass mt-8 grid gap-3 rounded-2xl p-5 md:grid-cols-[1fr_180px_220px_auto]" action="/admin/files">
        <input name="q" defaultValue={filters.q} placeholder="搜索文件名、路径、URL 或工具名" className={inputClass} />
        <select name="storage" defaultValue={filters.storage ?? ""} className={selectClass}>
          <option value="">全部存储</option>
          <option value="local">本地 uploads</option>
          <option value="cos">腾讯云 COS</option>
        </select>
        <select name="toolId" defaultValue={filters.toolId ?? ""} className={selectClass}>
          <option value="">全部工具</option>
          {tools.map((tool) => <option key={tool.id} value={tool.id}>{tool.name}</option>)}
        </select>
        <button className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-[#E8EEF8]">筛选文件</button>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-[#8B95A7]">
        <span>共 {total} 个文件，当前第 {filters.page} / {pageCount} 页</span>
        <div className="flex gap-2">
          <Link
            href={buildAdminFilePageHref(filters, filters.page - 1)}
            aria-disabled={filters.page <= 1}
            className={`rounded-full border border-white/12 px-4 py-2 ${filters.page <= 1 ? "pointer-events-none opacity-40" : ""}`}
          >
            上一页
          </Link>
          <Link
            href={buildAdminFilePageHref(filters, filters.page + 1)}
            aria-disabled={filters.page >= pageCount}
            className={`rounded-full border border-white/12 px-4 py-2 ${filters.page >= pageCount ? "pointer-events-none opacity-40" : ""}`}
          >
            下一页
          </Link>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {files.map((file) => (
          <div key={file.id} className="glass rounded-2xl p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[#8B95A7]">
              <span>{file.primaryFor ? `作为下载文件：${file.primaryFor.name}` : "未作为主下载文件"}</span>
              <span className={`rounded-full border px-2 py-1 ${
                parseCosFilePath(file.filePath)
                  ? "border-[#48F5D3]/30 bg-[#48F5D3]/10 text-[#48F5D3]"
                  : "border-white/10 bg-white/5 text-[#8B95A7]"
              }`}>
                {parseCosFilePath(file.filePath) ? "COS" : "本地"}
              </span>
              <span>{file.createdAt.toLocaleString("zh-CN")}</span>
            </div>

            <form action={upsertFileAction} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="id" value={file.id} />
              <Field label="文件名"><input name="fileName" defaultValue={file.fileName} className={inputClass} /></Field>
              <Field label="绑定工具">
                <select name="toolId" defaultValue={file.toolId ?? ""} className={selectClass}>
                  <option value="">不绑定</option>
                  {tools.map((tool) => <option key={tool.id} value={tool.id}>{tool.name}</option>)}
                </select>
              </Field>
              <Field label="文件路径"><input name="filePath" defaultValue={file.filePath} className={inputClass} /></Field>
              <Field label="文件 URL"><input name="fileUrl" defaultValue={file.fileUrl ?? ""} className={inputClass} /></Field>
              <Field label="版本"><input name="version" defaultValue={file.version ?? ""} className={inputClass} /></Field>
              <Field label="MIME"><input name="mimeType" defaultValue={file.mimeType ?? ""} className={inputClass} /></Field>
              <Field label="大小 bytes"><input name="fileSize" type="number" defaultValue={file.fileSize?.toString() ?? ""} className={inputClass} /></Field>
              <div className="flex items-end"><SubmitButton>保存文件</SubmitButton></div>
            </form>

            <form action={deleteFileAdminAction} className="mt-4 border-t border-white/10 pt-4">
              <input type="hidden" name="id" value={file.id} />
              <SubmitButton variant="danger" pendingLabel="删除中...">
                删除文件
              </SubmitButton>
              <span className="ml-3 text-xs text-[#8B95A7]">
                删除时会解绑作为下载文件使用的工具，并清理该文件的下载记录。
              </span>
            </form>
          </div>
        ))}
      </div>
    </AdminSection>
  );
}

function FileForm({ tools }: { tools: { id: string; name: string }[] }) {
  return (
    <form action={upsertFileAction} className="glass grid gap-4 rounded-2xl p-6 md:grid-cols-2">
      <Field label="文件名"><input name="fileName" required className={inputClass} /></Field>
      <Field label="绑定工具">
        <select name="toolId" className={selectClass}>
          <option value="">不绑定</option>
          {tools.map((tool) => <option key={tool.id} value={tool.id}>{tool.name}</option>)}
        </select>
      </Field>
      <Field label="文件路径"><input name="filePath" required placeholder="/uploads/app.exe 或 cos://..." className={inputClass} /></Field>
      <Field label="文件 URL"><input name="fileUrl" placeholder="/uploads/app.exe 或 https://..." className={inputClass} /></Field>
      <Field label="版本"><input name="version" className={inputClass} /></Field>
      <Field label="MIME"><input name="mimeType" className={inputClass} /></Field>
      <Field label="大小 bytes"><input name="fileSize" type="number" className={inputClass} /></Field>
      <div className="flex items-end"><SubmitButton>新增文件</SubmitButton></div>
    </form>
  );
}
