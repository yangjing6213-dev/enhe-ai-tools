import type { SeoAuditAdminErrorCode } from "@/lib/seo-audit/admin";

// Only translate application-owned values. Keep site names, engine findings and diagnostic codes intact.
const values: Record<string, string> = {
  queued: "排队中", running: "执行中", completed: "已完成",
  failed: "失败", cancel_requested: "正在取消", cancelled: "已取消",
  free: "免费巡检", professional: "专业巡检", deep: "深度巡检",
  recheck: "复检", scheduled: "计划巡检",
  active: "订阅生效中", paused: "已暂停", expired: "已到期", refunded: "已退款",
  weekly: "每周", biweekly: "每两周", monthly: "每月",
  seo_audit_credit: "巡检次数包", seo_audit_monitoring: "巡检监控订阅",
  vip: "会员", software_download: "软件下载",
  critical: "严重", high: "高风险", medium: "中风险", low: "低风险",
  info: "提示", warning: "警告", unknown: "未知",
  target: "目标网站", attempt_limit: "已达重试上限", system: "系统",
};

export function auditValue(value: string | undefined) {
  if (!value) return "—";
  const label = Object.hasOwn(values, value) ? values[value] : undefined;
  return label ?? value;
}

const errors = {
  SEO_AUDIT_RUN_NOT_FOUND: "找不到这次巡检。",
  SEO_AUDIT_RETRY_NOT_ALLOWED: "当前状态不允许重试，请刷新后查看最新状态。",
  SEO_AUDIT_RUN_REFUNDED: "关联订单或次数包已退款或正在退款，无法重试。",
  SEO_AUDIT_CANCEL_NOT_ALLOWED: "当前状态不允许取消巡检。",
  SEO_AUDIT_CANCEL_CONFLICT: "巡检状态已变化，请刷新后重试。",
  SEO_AUDIT_SUBSCRIPTION_NOT_FOUND: "找不到这项订阅。",
  SEO_AUDIT_SCHEDULE_NOT_FOUND: "该订阅没有执行计划。",
  SEO_AUDIT_SCHEDULE_PAUSE_NOT_ALLOWED: "当前订阅状态不允许暂停计划。",
} satisfies Record<SeoAuditAdminErrorCode, string>;

export function auditActionError(code: string) {
  if (Object.hasOwn(errors, code)) return errors[code as SeoAuditAdminErrorCode];
  return "请刷新页面并重新核对巡检状态。";
}

const failureMessages = new Map([
  ["The audit target is invalid.", "巡检目标无效。"],
  ["The audit target blocked the requested crawl.", "目标网站阻止了本次抓取。"],
  ["The audit worker timed out.", "执行端运行超时。"],
  ["The audit worker could not complete network requests.", "执行端未能完成网络请求。"],
  ["The audit worker failed internally.", "执行端发生内部错误。"],
  ["The audit report artifact was invalid.", "生成的巡检报告文件无效。"],
  ["The audit report artifact could not be stored.", "巡检报告文件保存失败。"],
  ["The audit exceeded its maximum attempts.", "巡检已达到最大尝试次数。"],
  ["No failure message recorded.", "未记录失败原因。"],
]);

export function auditFailureMessage(message: string) {
  return failureMessages.get(message) ?? message;
}
