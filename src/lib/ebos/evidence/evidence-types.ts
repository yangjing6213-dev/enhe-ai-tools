import type { EbosWarning } from "../types";

export type EbosEvidenceFileStat = {
  mtimeMs: number;
};

export type EbosEvidenceFileSystem = {
  readdir(directory: string): Promise<string[]>;
  readFile(filePath: string, encoding: "utf8"): Promise<string>;
  stat(filePath: string): Promise<EbosEvidenceFileStat>;
};

export type EbosLatestJsonReport = {
  filePath: string;
  fileName: string;
  dateKey: string | null;
  mtimeMs: number;
};

export type EbosEvidenceReadResult<T> = {
  filePath: string;
  data: T | null;
  warning?: EbosWarning;
};
