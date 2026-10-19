import { mkdir, open } from "node:fs/promises";
import { dirname } from "node:path";

export type AiWorkflowCosCredentials = { secretId: string; secretKey: string };

const credentialTemplate = "COS_SECRET_ID,COS_SECRET_KEY\r\n,\r\n";

export function parseAiWorkflowCosCredentialsCsv(csv: string): AiWorkflowCosCredentials | null {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index]!;
    if (quoted) {
      if (char === '"' && csv[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field.length === 0) {
      quoted = true;
    } else if (char === ",") {
      row.push(field.trim());
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && csv[index + 1] === "\n") index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  if (quoted || rows.length < 2) return null;

  const headings = rows[0]!.map((value) => value.replace(/^\uFEFF/, "").trim().toUpperCase().replace(/[^A-Z0-9]/g, ""));
  const secretIdIndex = headings.findIndex((value) => value === "COSSECRETID" || value === "SECRETID");
  const secretKeyIndex = headings.findIndex((value) => value === "COSSECRETKEY" || value === "SECRETKEY");
  if (secretIdIndex < 0 || secretKeyIndex < 0) return null;
  for (const values of rows.slice(1)) {
    const secretId = values[secretIdIndex]?.trim() ?? "";
    const secretKey = values[secretKeyIndex]?.trim() ?? "";
    if (secretId && secretKey) return { secretId, secretKey };
  }
  return null;
}

export async function readAiWorkflowCosCredentialsCsv(filePath: string): Promise<AiWorkflowCosCredentials> {
  let handle;
  try {
    handle = await open(filePath, "r+");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw new Error("COS credential CSV could not be opened.");
    await mkdir(dirname(filePath), { recursive: true });
    try {
      handle = await open(filePath, "wx");
      await handle.writeFile(credentialTemplate, "utf8");
      await handle.close();
    } catch (createError) {
      if ((createError as NodeJS.ErrnoException).code !== "EEXIST") throw new Error("An empty COS credential CSV template could not be created.");
    }
    return readAiWorkflowCosCredentialsCsv(filePath);
  }

  let csv: string;
  try {
    const fileInfo = await handle.stat();
    if (fileInfo.size === 0) {
      await handle.writeFile(credentialTemplate, "utf8");
      csv = credentialTemplate;
    } else {
      csv = await handle.readFile("utf8");
    }
  } finally {
    await handle.close();
  }

  const credentials = parseAiWorkflowCosCredentialsCsv(csv);
  if (!credentials) throw new Error("COS credential CSV must have non-empty COS_SECRET_ID and COS_SECRET_KEY columns; a non-empty file was left unchanged.");
  return credentials;
}
