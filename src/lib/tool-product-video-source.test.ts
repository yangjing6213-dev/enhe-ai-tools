import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function readProjectFile(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function readProjectFileIfExists(path: string) {
  const fullPath = join(root, path);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function videoMigrationSource() {
  const migrationsDir = join(root, "prisma/migrations");
  return readdirSync(migrationsDir)
    .filter((name) => name.includes("tool_video"))
    .sort()
    .map((videoMigration) => {
      const migrationPath = join(migrationsDir, videoMigration, "migration.sql");
      return existsSync(migrationPath) ? readFileSync(migrationPath, "utf8") : "";
    })
    .join("\n");
}

describe("tool product video source", () => {
  it("adds product-level video fields to Tool and the database migration", () => {
    const schema = readProjectFile("prisma/schema.prisma");
    const toolModel = schema.slice(schema.indexOf("model Tool {"), schema.indexOf("model ToolTag {"));
    const migration = videoMigrationSource();

    expect(toolModel).toMatch(/videoUrl\s+String\?\s+@map\("video_url"\)/);
    expect(toolModel).toMatch(/videoTitle\s+String\?\s+@map\("video_title"\)/);
    expect(toolModel).toMatch(/videoDescription\s+String\?\s+@map\("video_description"\)/);
    expect(toolModel).toMatch(/videoUrl2\s+String\?\s+@map\("video_url_2"\)/);
    expect(toolModel).toMatch(/videoTitle2\s+String\?\s+@map\("video_title_2"\)/);
    expect(toolModel).toMatch(/videoDescription2\s+String\?\s+@map\("video_description_2"\)/);
    expect(toolModel).toMatch(/videoUrl3\s+String\?\s+@map\("video_url_3"\)/);
    expect(toolModel).toMatch(/videoTitle3\s+String\?\s+@map\("video_title_3"\)/);
    expect(toolModel).toMatch(/videoDescription3\s+String\?\s+@map\("video_description_3"\)/);
    expect(migration).toContain('ADD COLUMN "video_url" TEXT');
    expect(migration).toContain('ADD COLUMN "video_title" TEXT');
    expect(migration).toContain('ADD COLUMN "video_description" TEXT');
    expect(migration).toContain('ADD COLUMN "video_url_2" TEXT');
    expect(migration).toContain('ADD COLUMN "video_title_2" TEXT');
    expect(migration).toContain('ADD COLUMN "video_description_2" TEXT');
    expect(migration).toContain('ADD COLUMN "video_url_3" TEXT');
    expect(migration).toContain('ADD COLUMN "video_title_3" TEXT');
    expect(migration).toContain('ADD COLUMN "video_description_3" TEXT');
  });

  it("lets admins upload, keep, title, and describe up to three product videos", () => {
    const editor = readProjectFile("src/app/admin/tool-admin-list.tsx");
    const actions = readProjectFile("src/app/admin/actions.ts");
    const uploadField = readProjectFile("src/app/admin/tool-video-upload-field.tsx");

    expect(editor).toContain("ToolVideoUploadField");
    expect(editor).toContain('urlName="videoUrl"');
    expect(editor).toContain('name="videoTitle"');
    expect(editor).toContain('name="videoDescription"');
    expect(editor).toContain('urlName="videoUrl2"');
    expect(editor).toContain('name="videoTitle2"');
    expect(editor).toContain('name="videoDescription2"');
    expect(editor).toContain('urlName="videoUrl3"');
    expect(editor).toContain('name="videoTitle3"');
    expect(editor).toContain('name="videoDescription3"');
    expect(uploadField).toContain("maxVideoBytes");
    expect(uploadField).toContain("video/mp4");
    expect(uploadField).toContain("video/webm");
    expect(uploadField).toContain("video/quicktime");
    expect(actions).toContain('formData.get("videoUrl")');
    expect(actions).toContain('formData.get("videoUrl2")');
    expect(actions).toContain('formData.get("videoUrl3")');
    expect(actions).toContain("videoUrl:");
    expect(actions).toContain("videoTitle:");
    expect(actions).toContain("videoDescription:");
    expect(actions).toContain("videoUrl2:");
    expect(actions).toContain("videoTitle2:");
    expect(actions).toContain("videoDescription2:");
    expect(actions).toContain("videoUrl3:");
    expect(actions).toContain("videoTitle3:");
    expect(actions).toContain("videoDescription3:");
  });

  it("renders click-to-play product video previews before the product image gallery on public detail pages", () => {
    const detail = readProjectFile("src/app/tools/[slug]/page-shell.tsx");
    const helper = readProjectFile("src/lib/product-video.ts");
    const player = readProjectFile("src/components/product-video-player.tsx");

    expect(detail).toContain("resolveProductVideos");
    expect(detail).toContain("tool-detail-product-video");
    expect(detail).toContain("ProductVideoPlayer");
    expect(detail.indexOf("tool-detail-product-video")).toBeLessThan(detail.indexOf("tool-detail-product-gallery"));
    expect(detail).toContain("deferUntilClicked");
    expect(player).toContain("<video");
    expect(player).toContain("deferUntilClicked");
    expect(player).toContain("if (!activated)");
    expect(player).toContain("autoPlay");
    expect(player).toContain("controls");
    expect(player).toContain("muted");
    expect(player).toContain('preload="none"');
    expect(player).toContain("IntersectionObserver");
    expect(player).toContain("video.src = src");
    expect(helper).toContain("resolveProductVideos");
    expect(helper).toContain("resolveProductVideoSrc");
    expect(detail).toContain("tool.videoUrl3");
    expect(helper).toContain("slice(0, 3)");
  });

  it("keeps every product video window in a clipped 16:9 rectangular frame", () => {
    const css = readProjectFile("src/app/globals.css");
    const stage = css.match(/\.tool-detail-video-stage\s*\{([^}]*)\}/)?.[1] ?? "";
    const video = css.match(/\.tool-detail-video-stage\s*>\s*video\s*\{([^}]*)\}/)?.[1] ?? "";
    const preview = css.match(/\.tool-detail-video-preview\s*>\s*span:first-child\s*\{([^}]*)\}/)?.[1] ?? "";

    expect(stage).toMatch(/aspect-ratio:\s*16\s*\/\s*9/);
    expect(stage).toMatch(/overflow:\s*hidden/);
    expect(stage).toMatch(/border-radius:\s*var\(--enhe-card-r,\s*16px\)/);
    expect(video).toMatch(/display:\s*block/);
    expect(video).toMatch(/width:\s*100%/);
    expect(video).toMatch(/height:\s*100%/);
    expect(video).toMatch(/border-radius:\s*0/);
    expect(preview).toMatch(/width:\s*100%/);
    expect(preview).toMatch(/height:\s*100%/);
  });

  it("proxies private COS product videos instead of rendering forbidden public URLs", () => {
    const helper = readProjectFile("src/lib/product-video.ts");
    const route = readProjectFile("src/app/api/tool-videos/route.ts");
    const uploadRoute = readProjectFile("src/app/api/admin/tool-video-upload/route.ts");

    expect(helper).toContain("parseCosFilePath");
    expect(helper).toContain("parseCosPublicUrl");
    expect(helper).toContain("/api/tool-videos?src=");
    expect(route).toContain("getSecureCosMediaUrl");
    expect(route).toContain("NextResponse.redirect");
    expect(uploadRoute).toContain('stored.storage === "cos" ? stored.filePath : stored.fileUrl');
  });

  it("serves uploaded videos with byte ranges for browser playback", () => {
    const uploadRoute = readProjectFile("src/app/api/uploads/[...fileName]/route.ts");

    expect(uploadRoute).toContain("parseRangeHeader");
    expect(uploadRoute).toContain("createReadStream");
    expect(uploadRoute).toContain("Accept-Ranges");
    expect(uploadRoute).toContain("Content-Range");
    expect(uploadRoute).toContain("status: 206");
    expect(uploadRoute).toContain('".mp4": "video/mp4"');
  });

  it("uploads product videos before the product save action so large files are not submitted through Server Actions", () => {
    const editor = readProjectFile("src/app/admin/tool-admin-list.tsx");
    const actions = readProjectFile("src/app/admin/actions.ts");
    const uploadField = readProjectFileIfExists("src/app/admin/tool-video-upload-field.tsx");
    const uploadRoute = readProjectFileIfExists("src/app/api/admin/tool-video-upload/route.ts");

    expect(editor).toContain("ToolVideoUploadField");
    expect(editor).not.toContain('name="videoFile"');
    expect(editor).not.toContain('name="videoFile2"');
    expect(editor).not.toContain('name="videoFile3"');
    expect(actions).not.toContain('formData.get("videoFile")');
    expect(actions).not.toContain('formData.get("videoFile2")');
    expect(actions).not.toContain('formData.get("videoFile3")');
    expect(uploadField).toContain('xhr.open("POST", "/api/admin/tool-video-upload")');
    expect(uploadField).toContain("name={urlName}");
    expect(uploadRoute).toContain("saveUploadedFile");
    expect(uploadRoute).toContain("isLikelyUploadableVideo");
    expect(uploadRoute).toContain('stored.storage === "cos" ? stored.filePath : stored.fileUrl');
  });

  it("keeps video upload parser failures inside the upload API response", () => {
    const uploadRoute = readProjectFileIfExists("src/app/api/admin/tool-video-upload/route.ts");

    expect(uploadRoute).toContain("let formData: FormData");
    expect(uploadRoute).toContain("await request.formData()");
    expect(uploadRoute).toContain("视频上传请求解析失败");
    expect(uploadRoute).toContain("{ status: 413 }");
  });
});
