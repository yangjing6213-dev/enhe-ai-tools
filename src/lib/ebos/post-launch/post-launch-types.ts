import type {
  EbosDeploymentExecutionStatus,
  EbosDeploymentStatus
} from "../deployment-execution";

export type EbosPostLaunchOverallStatus = "passed" | "failed" | "partial";
export type EbosPostLaunchCheckItemStatus = "pass" | "warning" | "fail";

export type EbosPostLaunchCheckItem = {
  id: string;
  title: string;
  status: EbosPostLaunchCheckItemStatus;
  expected: string;
  actual: string;
  evidence: string;
};

export type EbosPostLaunchRouteResult = {
  route: string;
  url: string;
  httpStatus: number;
  ok: boolean;
  finalUrl?: string;
  contentChecks: EbosPostLaunchCheckItem[];
  metadataChecks: EbosPostLaunchCheckItem[];
  ctaChecks: EbosPostLaunchCheckItem[];
  faqChecks: EbosPostLaunchCheckItem[];
  complianceChecks: EbosPostLaunchCheckItem[];
  warnings: string[];
  blockers: string[];
};

export type EbosPostLaunchStatusTransition = {
  previousStatus: EbosDeploymentStatus;
  nextStatus: EbosDeploymentStatus;
  updated: boolean;
  backupPath?: string;
  reason: string;
  warnings: string[];
};

export type EbosPostLaunchLiveCheckReport = {
  reportType: "post_launch_live_check";
  targetDate: string;
  generatedAt: string;
  siteUrl: string;
  currentDeploymentStatus: EbosDeploymentStatus;
  checkedRoutes: string[];
  routeResults: EbosPostLaunchRouteResult[];
  overallStatus: EbosPostLaunchOverallStatus;
  canTransitionToVerified: boolean;
  statusTransition: EbosPostLaunchStatusTransition;
  blockers: string[];
  warnings: string[];
  nextActions: string[];
};

export type EbosPostLaunchContentCheckResult = Pick<
  EbosPostLaunchRouteResult,
  "contentChecks" | "metadataChecks" | "ctaChecks" | "faqChecks" | "complianceChecks" | "warnings" | "blockers"
>;

export type EbosPostLaunchLiveCheckOptions = {
  targetDate: string;
  siteUrl: string;
  currentDeploymentStatus: EbosDeploymentStatus;
  routes?: string[];
  now?: string;
  fetcher?: EbosPostLaunchFetch;
};

export type EbosPostLaunchFetchResponse = {
  ok: boolean;
  status: number;
  url?: string;
  text: () => Promise<string>;
};

export type EbosPostLaunchFetch = (
  url: string,
  init: { method: "GET"; redirect: "follow"; headers: Record<string, string> }
) => Promise<EbosPostLaunchFetchResponse>;

export type EbosVerifyDeploymentOptions = {
  statusPath: string;
  report: EbosPostLaunchLiveCheckReport;
  now?: string;
  backupDir?: string;
  verificationCommand: string;
};

export type EbosCanVerifyDeploymentOptions = {
  currentStatus: EbosDeploymentExecutionStatus;
  report: EbosPostLaunchLiveCheckReport;
};
