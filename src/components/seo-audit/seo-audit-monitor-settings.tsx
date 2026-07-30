import { Pause, Play, Save } from "lucide-react";
import { updateSeoAuditScheduleAction } from "@/app/user/seo-audit/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import type { Locale } from "@/lib/i18n";

type MonitorSettingsProps = {
  locale: Locale;
  subscriptionId: string;
  fallbackNotificationEmail?: string | null;
  schedule: {
    cadence: "weekly" | "biweekly" | "monthly";
    weekday: number;
    hour: number;
    minute: number;
    enabled: boolean;
    notificationEmail: string | null;
  };
};

const weekdayLabels = {
  zh: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
} as const;

export function SeoAuditMonitorSettings({
  locale,
  subscriptionId,
  fallbackNotificationEmail,
  schedule,
}: MonitorSettingsProps) {
  const en = locale === "en";
  const notificationEmail =
    schedule.notificationEmail ?? fallbackNotificationEmail ?? "";

  return (
    <form action={updateSeoAuditScheduleAction} className="mt-5 grid gap-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="subscriptionId" value={subscriptionId} />
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-2 text-sm">
          <span className="text-[var(--marketing-muted)]">
            {en ? "Frequency" : "频率"}
          </span>
          <select
            name="cadence"
            defaultValue={schedule.cadence}
            className="form-select-dark"
          >
            <option value="weekly">{en ? "Weekly" : "每周"}</option>
            <option value="biweekly">{en ? "Every 2 weeks" : "每两周"}</option>
            <option value="monthly">{en ? "Monthly" : "每月"}</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          <span className="text-[var(--marketing-muted)]">
            {en ? "Run day" : "执行日"}
          </span>
          <select
            name="weekday"
            defaultValue={schedule.weekday}
            className="form-select-dark"
          >
            {weekdayLabels[locale].map((label, value) => (
              <option key={label} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          <span className="text-[var(--marketing-muted)]">
            {en ? "Local time" : "北京时间"}
          </span>
          <select
            name="hour"
            defaultValue={schedule.hour}
            className="form-select-dark"
          >
            {Array.from({ length: 24 }, (_, hour) => (
              <option key={hour} value={hour}>
                {String(hour).padStart(2, "0")}:00
              </option>
            ))}
          </select>
          <input type="hidden" name="minute" value={schedule.minute} />
        </label>
      </div>
      <label className="grid max-w-xl gap-2 text-sm">
        <span className="text-[var(--marketing-muted)]">
          {en ? "Notification email" : "通知邮箱"}
        </span>
        <input
          type="email"
          name="notificationEmail"
          autoComplete="email"
          maxLength={320}
          defaultValue={notificationEmail}
          className="form-control-dark"
        />
      </label>
      <div className="flex flex-wrap gap-3">
        <input
          type="hidden"
          name="enabled"
          value={schedule.enabled ? "true" : "false"}
        />
        <FormSubmitButton
          pendingLabel={en ? "Saving..." : "保存中..."}
          className="inline-flex items-center gap-2"
        >
          <Save aria-hidden="true" className="h-4 w-4" />
          {en ? "Save plan" : "保存计划"}
        </FormSubmitButton>
      </div>
    </form>
  );
}

export function SeoAuditMonitorToggle({
  locale,
  subscriptionId,
  fallbackNotificationEmail,
  schedule,
}: MonitorSettingsProps) {
  const en = locale === "en";
  const Icon = schedule.enabled ? Pause : Play;
  const notificationEmail =
    schedule.notificationEmail ?? fallbackNotificationEmail ?? "";
  return (
    <form action={updateSeoAuditScheduleAction}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="subscriptionId" value={subscriptionId} />
      <input type="hidden" name="cadence" value={schedule.cadence} />
      <input type="hidden" name="weekday" value={schedule.weekday} />
      <input type="hidden" name="hour" value={schedule.hour} />
      <input type="hidden" name="minute" value={schedule.minute} />
      <input
        type="hidden"
        name="enabled"
        value={schedule.enabled ? "false" : "true"}
      />
      <input type="hidden" name="notificationEmail" value={notificationEmail} />
      <FormSubmitButton
        variant="secondary"
        pendingLabel={en ? "Updating..." : "更新中..."}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm"
      >
        <Icon aria-hidden="true" className="h-4 w-4" />
        {schedule.enabled ? (en ? "Pause" : "暂停") : en ? "Resume" : "恢复"}
      </FormSubmitButton>
    </form>
  );
}
