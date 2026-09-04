import type { EbosDeploymentStatus } from "../deployment-execution";
import type { EbosPostLaunchCheckItem, EbosPostLaunchOverallStatus } from "./post-launch-types";

export type EbosOptimizedPageRedeployRouteResult = {
  route: string;
  url: string;
  httpStatus: number;
  ok: boolean;
  finalUrl?: string;
  contentChecks: EbosPostLaunchCheckItem[];
  blockers: string[];
  warnings: string[];
};

export type EbosOptimizedPageRedeployCheckReport = {
  reportType: "optimized_page_redeploy_check";
  targetDate: string;
  generatedAt: string;
  siteUrl: string;
  checkedRoutes: string[];
  routeResults: EbosOptimizedPageRedeployRouteResult[];
  overallStatus: EbosPostLaunchOverallStatus;
  blockers: string[];
  warnings: string[];
  summary: string;
};

export type EbosOptimizedValidationPageRedeployReport = {
  reportType: "optimized_validation_page_redeploy";
  targetDate: string;
  generatedAt: string;
  gitCommitHash: string | null;
  gitPushResult: "success" | "failed" | "not_run";
  serverPath: string;
  gitPullResult: "success" | "failed" | "not_run";
  dockerBuildResult: "success" | "failed" | "not_run";
  dockerUpResult: "success" | "failed" | "not_run";
  nginxReloadResult: "success" | "failed" | "not_required" | "not_run";
  checkedRoutes: string[];
  optimizedContentCheckStatus: EbosPostLaunchOverallStatus;
  deploymentStatus: EbosDeploymentStatus;
  postLaunchCheckStatus: EbosPostLaunchOverallStatus;
  externalPublishingStatus: string;
  hasRealSignals: boolean;
  canBackfill: boolean;
  warnings: string[];
  nextActions: string[];
  optimizedRedeployCheckPath?: string;
  postLaunchLiveCheckPath?: string;
};

export type EbosOptimizedValidationPageRedeployStatusSummary = {
  status: "not_generated" | "generated";
  targetDate: string;
  redeployed: boolean;
  reportPath?: string;
  checkPath?: string;
  gitCommitHash?: string | null;
  gitPushResult?: EbosOptimizedValidationPageRedeployReport["gitPushResult"];
  gitPullResult?: EbosOptimizedValidationPageRedeployReport["gitPullResult"];
  dockerBuildResult?: EbosOptimizedValidationPageRedeployReport["dockerBuildResult"];
  dockerUpResult?: EbosOptimizedValidationPageRedeployReport["dockerUpResult"];
  nginxReloadResult?: EbosOptimizedValidationPageRedeployReport["nginxReloadResult"];
  optimizedContentCheckStatus?: EbosPostLaunchOverallStatus;
  postLaunchCheckStatus?: EbosPostLaunchOverallStatus;
  deploymentStatus?: EbosDeploymentStatus;
  externalPublishingStatus?: string;
  hasRealSignals?: boolean;
  canBackfill?: boolean;
  warnings: string[];
  summary: string;
};
