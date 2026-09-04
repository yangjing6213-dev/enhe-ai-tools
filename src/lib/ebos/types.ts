export type EbosReportType = "weekly" | "monthly";

export type EbosSectionKey =
  | "revenue"
  | "traffic"
  | "seo"
  | "geo"
  | "product"
  | "content"
  | "market"
  | "competitor"
  | "website_health"
  | "next_plan";

export type EbosDataSourceKey =
  | "google_search_console"
  | "google_analytics"
  | "bing_webmaster"
  | "cloudflare"
  | "internal_database"
  | "whop"
  | "manual_input"
  | "market_research"
  | "ai_search_probe";

export type EbosDataSourceStatus =
  | "not_configured"
  | "unavailable"
  | "partial"
  | "available";

export type EbosScore = number;

export type EbosScoreGrade =
  | "excellent"
  | "good"
  | "warning"
  | "critical"
  | "unknown";

export type EbosConfidenceLevel =
  | "unknown"
  | "unavailable"
  | "partial"
  | "complete";

export type EbosWarningCode =
  | "missing_data"
  | "partial_data"
  | "no_revenue"
  | "low_confidence";

export type EbosWarningSeverity = "info" | "warning" | "critical";

export type EbosWarning = {
  code: EbosWarningCode;
  message: string;
  severity: EbosWarningSeverity;
  source?: EbosDataSourceKey;
  section?: EbosSectionKey;
};

export type EbosActionPriority = "high" | "medium" | "low";

export type EbosActionStatus = "open" | "planned" | "done" | "dismissed";

export type EbosActionItem = {
  id?: string;
  title: string;
  description?: string;
  priority: EbosActionPriority;
  status: EbosActionStatus;
  sectionKey?: EbosSectionKey;
  targetPath?: string;
  targetAdminPath?: string;
  expectedImpact?: string;
  effort?: "low" | "medium" | "high";
  confidence?: EbosConfidenceLevel;
  verification: string;
};

export type EbosOKRStatus = "not_started" | "in_progress" | "at_risk" | "done";

export type EbosOKR = {
  objective: string;
  keyResults: Array<{
    title: string;
    current?: number;
    target?: number;
    unit?: string;
    status: EbosOKRStatus;
  }>;
};

export type EbosDataSourceState = {
  key: EbosDataSourceKey;
  status: EbosDataSourceStatus;
  label: string;
  lastCheckedAt?: Date;
  warnings: EbosWarning[];
  metadata?: Record<string, unknown>;
};

export type EbosDateWindow = {
  start: Date;
  end: Date;
  timezone: "local" | "Asia/Shanghai";
};

export type EbosReportSection = {
  key: EbosSectionKey;
  title: string;
  score: EbosScore | null;
  grade: EbosScoreGrade;
  confidence: EbosConfidenceLevel;
  findings: string[];
  risks: string[];
  opportunities: string[];
  actionItems: EbosActionItem[];
  warnings: EbosWarning[];
  dataSources: EbosDataSourceState[];
  weight: number;
};

export type EbosReport = {
  version: "1.0";
  type: EbosReportType;
  period: EbosDateWindow;
  generatedAt: Date;
  overallScore: EbosScore | null;
  confidence: EbosConfidenceLevel;
  sections: EbosReportSection[];
  warnings: EbosWarning[];
  actionItems: EbosActionItem[];
  okrs: EbosOKR[];
};

export type EbosReportValidationResult = {
  valid: boolean;
  errors: string[];
};

