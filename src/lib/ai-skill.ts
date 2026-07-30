export const supportedAiAgentOptions = [
  "Codex",
  "OpenClaw",
  "Claude Code",
  "Cursor",
  "Cline",
] as const;

export const aiSkillPackageMaxBytes = 100 * 1024 * 1024;

const aiSkillZipMimeTypes = new Set([
  "",
  "application/octet-stream",
  "application/zip",
  "application/x-zip-compressed",
]);

export function isZipFileSignature(bytes: Uint8Array) {
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) return false;
  return (
    (bytes[2] === 0x03 && bytes[3] === 0x04) ||
    (bytes[2] === 0x05 && bytes[3] === 0x06) ||
    (bytes[2] === 0x07 && bytes[3] === 0x08)
  );
}

export function normalizeSupportedAgents(values: readonly string[]) {
  const optionByKey = new Map(
    supportedAiAgentOptions.map((option) => [option.toLowerCase(), option]),
  );
  const normalized = values
    .map((value) => optionByKey.get(value.trim().toLowerCase()))
    .filter((value): value is (typeof supportedAiAgentOptions)[number] => Boolean(value));

  return Array.from(new Set(normalized));
}

export function validateAiSkillPackage(file: {
  name: string;
  type: string;
  size: number;
}) {
  if (!file.name.toLowerCase().endsWith(".zip")) {
    return "仅支持上传 ZIP 格式的 Skill 压缩包。";
  }
  if (!aiSkillZipMimeTypes.has(file.type.toLowerCase())) {
    return "文件类型不是有效的 ZIP 压缩包。";
  }
  if (file.size <= 0) return "ZIP 压缩包不能为空。";
  if (file.size > aiSkillPackageMaxBytes) {
    return "Skill ZIP 压缩包不能超过 100MB。";
  }
  return null;
}
