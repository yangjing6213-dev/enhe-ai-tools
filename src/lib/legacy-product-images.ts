const visualRoot = "/images/products/enhe-visuals";

const legacyProductImageFallbacks: Record<string, string> = {
  "1784128582916-tool-cover-ai-prompt-ai-prompt-management-enhe-cover-bilingual-v2.png": `${visualRoot}/ai/cover.png`,
  "1784038998590-tool-cover-infinitetalk-ai-chatgpt-image-2026-7-14-20-18-23.png": `${visualRoot}/ai/cover.png`,
  "1783709184244-tool-cover-codex-api-chatgpt-image-2026-7-11-02-42-54.png": `${visualRoot}/chatgpt-codex-dalle/cover.png`,
  "1783007262227-tool-cover-windows-ai-lumios-windows-ai-cover-1672x941.png": `${visualRoot}/lumios-personal-ai-companion/cover.png`,
  "1782230665915-tool-cover-ai-ai-chatgpt-image-2026-6-23-23-50-43-4-.png": `${visualRoot}/ai-ai/cover.png`,
  "1782230761787-tool-cover-zfb-chatgpt-image-2026-6-23-23-50-42-3-.png": `${visualRoot}/zfb/cover.png`,
  "1783100811343-tool-cover-ai-video-studio-ai-ai-video-studio-ai-ultimate-ai-video-cover-1672x941.png": `${visualRoot}/ai-video-studio-ai-ai-video-studio-ai/cover.png`,
  "1782924134779-tool-cover-faceswap-studio-ai-faceswap-studio-ai-cover-1672x941.png": `${visualRoot}/faceswap-studio-ai/cover.png`,
  "1782230711458-tool-cover-tool-mq12l5w6-chatgpt-image-2026-6-23-23-50-42-1-.png": `${visualRoot}/tool-mq12l5w6/cover.png`,
  "1781404871169-tool-cover-gmail-google-chatgpt-image-2026-6-14-10-33-10.png": `${visualRoot}/gmail-google/cover.png`,
  "1781404138862-tool-cover-chatgpt-codex-dalle-chatgpt-image-2026-6-14-10-08-56.png": `${visualRoot}/chatgpt-codex-dalle/cover.png`,
  "1781264464523-tool-cover-chatgpt-plus-100-.png": `${visualRoot}/chatgpt-plus-100/cover.png`,
  "1782229905692-tool-cover-ai-ai-ilo5a5-chatgpt-image-2026-6-23-23-50-44-7-.png": `${visualRoot}/ai-ai-ilo5a5/cover.png`,
  "1782229873213-tool-cover-ai-at8nui-chatgpt-image-2026-6-23-23-50-43-5-.png": `${visualRoot}/ai-at8nui/cover.png`,
  "1781196487288-tool-product-zfb-chatgpt-image-2026-6-12-00-21-51-2-.png": `${visualRoot}/zfb/detail-01-benefit.png`,
  "1781196487292-tool-product-zfb-chatgpt-image-2026-6-12-00-21-51-3-.png": `${visualRoot}/zfb/detail-02-mechanism.png`,
  "1781196487296-tool-product-zfb-chatgpt-image-2026-6-12-00-21-51-4-.png": `${visualRoot}/zfb/detail-03-scenario.png`,
  "1781196487306-tool-product-zfb-chatgpt-image-2026-6-12-00-21-52-5-.png": `${visualRoot}/zfb/detail-04-included.png`,
  "1781196487310-tool-product-zfb-chatgpt-image-2026-6-12-00-21-54-6-.png": `${visualRoot}/zfb/detail-05-specs.png`,
  "1780677241589-tool-product-faceswap-studio-ai-0aca09013fa0989d3eb40d35ff220d86.jpg": `${visualRoot}/faceswap-studio-ai/detail-01-benefit.png`,
  "1781699153721-tool-product-faceswap-studio-ai-cb8711281c2362a29092c36e77a9d3ea.png": `${visualRoot}/faceswap-studio-ai/detail-02-mechanism.png`,
  "1781699153722-tool-product-faceswap-studio-ai-f2d1ede4facad88d5c48a0ad06f0acec.png": `${visualRoot}/faceswap-studio-ai/detail-03-scenario.png`,
  "1780672763689-tool-product-tool-mq12l5w6-chatgpt-image-2026-6-4-22-18-46-3-.png": `${visualRoot}/tool-mq12l5w6/detail-01-benefit.png`,
  "1780672763686-tool-product-tool-mq12l5w6-chatgpt-image-2026-6-4-22-18-47-4-.png": `${visualRoot}/tool-mq12l5w6/detail-02-mechanism.png`,
  "1780672763703-tool-product-tool-mq12l5w6-chatgpt-image-2026-6-4-22-18-45-2-.png": `${visualRoot}/tool-mq12l5w6/detail-03-scenario.png`,
  "1781404871171-tool-product-gmail-google-2026-06-14-104055-919.png": `${visualRoot}/gmail-google/detail-01-benefit.png`,
  "1781367315912-tool-product-chatgpt-plus-100-chatgpt-image-2026-6-14-00-10-00.png": `${visualRoot}/chatgpt-plus-100/detail-01-benefit.png`,
  "1781777747300-tool-product-ai-ai-ilo5a5-3d5980eff68fcbc01bb140212dec93e4.jpg": `${visualRoot}/ai-ai-ilo5a5/detail-01-benefit.png`,
  "1781777747301-tool-product-ai-ai-ilo5a5-4c5307bc900b7302fe9c628de230967c.jpg": `${visualRoot}/ai-ai-ilo5a5/detail-02-mechanism.png`,
  "1781777747302-tool-product-ai-ai-ilo5a5-09f9e83254d5b77f05cfbb415d099047.jpg": `${visualRoot}/ai-ai-ilo5a5/detail-03-scenario.png`
};

export function getLegacyProductImageFallback(uploadPath: string) {
  const fileName = uploadPath.split("/").filter(Boolean).at(-1);
  return fileName ? legacyProductImageFallbacks[fileName] ?? null : null;
}
