import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("admin tool editor source", () => {
  it("lets React control server action form encoding", () => {
    const source = readFileSync(join(process.cwd(), "src/app/admin/tool-admin-list.tsx"), "utf8");

    expect(source).not.toContain('action={upsertToolAction} encType=');
    expect(source).not.toContain('action={upsertToolAction} method=');
  });

  it("places an unrestricted download link field below product images", () => {
    const source = readFileSync(join(process.cwd(), "src/app/admin/tool-admin-list.tsx"), "utf8");

    expect(source).toContain('name="downloadFileUrl"');
    expect(source).toContain("downloadFileUrlHint");
    expect(source).toContain("downloadFileUrl: \"下载链接\"");
    expect(source).not.toContain("下载链接 URL");
    expect(source).not.toContain("Download link URL");
    expect(source.indexOf("{copy.productImages}")).toBeLessThan(source.indexOf('name="downloadFileUrl"'));
    expect(source).toMatch(/<textarea\s+name="downloadFileUrl"/);
  });

  it("uses a client-side media upload guard before the server action submit", () => {
    const editorSource = readFileSync(join(process.cwd(), "src/app/admin/tool-admin-list.tsx"), "utf8");
    const guardSource = readFileSync(join(process.cwd(), "src/app/admin/tool-media-upload-guard.tsx"), "utf8");

    expect(editorSource).toContain("ToolMediaUploadGuard");
    expect(editorSource).not.toContain('name="coverImageFile" type="file"');
    expect(editorSource).not.toContain('name="screenshotFiles" type="file"');
    expect(guardSource).toContain('"use client"');
    expect(guardSource).toContain("maxImageBytes");
    expect(guardSource).toContain('"coverImageFile"');
    expect(guardSource).toContain('"screenshotFiles"');
    expect(guardSource).toContain("event.preventDefault()");
    expect(guardSource).toContain("input.value = \"\"");
  });

  it("centers access price and publish-check badges in tall admin list rows", () => {
    const source = readFileSync(join(process.cwd(), "src/app/admin/tool-admin-list.tsx"), "utf8");

    expect(source).toContain("grid grid-cols-[1.4fr_0.8fr_0.6fr_0.8fr_1.1fr_0.6fr] items-center gap-4 px-5 py-4");
    expect(source).toContain('className="flex flex-wrap items-center gap-2 self-center"');
  });

  it("uses an interactive product image manager that submits existing images in sorted order", () => {
    const editorSource = readFileSync(join(process.cwd(), "src/app/admin/tool-admin-list.tsx"), "utf8");
    const managerPath = join(process.cwd(), "src/app/admin/tool-product-image-manager.tsx");

    expect(editorSource).toContain("ToolProductImageManager");
    expect(editorSource).not.toContain('name="existingScreenshots" type="checkbox"');
    expect(existsSync(managerPath)).toBe(true);

    const managerSource = existsSync(managerPath) ? readFileSync(managerPath, "utf8") : "";
    expect(managerSource).toContain('"use client"');
    expect(managerSource).toContain("moveImage");
    expect(managerSource).toContain('name="existingScreenshots"');
    expect(managerSource).toContain("ArrowUp");
    expect(managerSource).toContain("ArrowDown");
    expect(managerSource).toContain("productImageMoveUp");
    expect(managerSource).toContain("productImageMoveDown");
  });

  it("lets admins mark a tool as recommended for the homepage", () => {
    const editorSource = readFileSync(join(process.cwd(), "src/app/admin/tool-admin-list.tsx"), "utf8");
    const actionsSource = readFileSync(join(process.cwd(), "src/app/admin/actions.ts"), "utf8");

    expect(editorSource).toContain('name="isHomeRecommended"');
    expect(editorSource).toContain("homeRecommended");
    expect(actionsSource).toContain("isHomeRecommended: parseBooleanField(formData.get(\"isHomeRecommended\"))");
    expect(actionsSource).toContain('revalidatePath("/")');
  });

  it("uses account-service copy and hides software/download-only fields for online tools", () => {
    const source = readFileSync(join(process.cwd(), "src/app/admin/tool-admin-list.tsx"), "utf8");

    expect(source).toContain("const isAccountService = type === \"online\"");
    expect(source).toContain("copy.serviceName");
    expect(source).toContain("copy.newService");
    expect(source).toContain("copy.createService");
    expect(source).toContain("copy.servicePrice");
    expect(source).toContain("copy.serviceEditorIntro");
    expect(source).toContain("{!isAccountService && !isSkillLearning ? (");
    expect(source).toContain("<Field label={copy.version}>");
    expect(source).toContain("<Field label={copy.systemRequirement}>");
    expect(source).not.toContain('name="onlineUrl"');
    expect(source).toContain("<Field label={copy.downloadFileUrl}");
    expect(source).toContain("isAccountService ? copy.deleteService : copy.deleteTool");
  });

  it("uses grouped price specifications and removes unused visible fields from the editor", () => {
    const source = readFileSync(join(process.cwd(), "src/app/admin/tool-admin-list.tsx"), "utf8");

    expect(source).toContain("copy.priceSpecSection");
    expect(source).toContain("priceSpecName_");
    expect(source).toContain("priceSpecPrice_");
    expect(source).toContain("copy.purchasePrice");
    expect(source).not.toContain("<Field label={copy.coverUrl}>");
    expect(source).not.toContain("<Field label={copy.downloadFile}>");
    expect(source).not.toContain("<input name=\"isDownloadPaid\"");
    expect(source).not.toContain("copy.paidDownload");
    expect(source).toContain('type="hidden" name="coverImage"');
    expect(source).toContain('type="hidden" name="downloadFileId"');
  });
});
