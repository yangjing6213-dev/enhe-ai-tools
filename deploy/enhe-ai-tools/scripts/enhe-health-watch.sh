#!/bin/sh
set -eu

APP_DIR="${APP_DIR:-/opt/enhe-ai-tools}"
HEALTH_URL="${ENHE_HEALTH_URL:-http://127.0.0.1:3001/api/health}"
STATE_FILE="${STATE_FILE:-$APP_DIR/backups/health-watch.last-alert}"
ALERT_INTERVAL_SECONDS="${ALERT_INTERVAL_SECONDS:-1800}"

mkdir -p "$(dirname "$STATE_FILE")"

response="$(curl -fsS --max-time 10 "$HEALTH_URL" 2>&1 || true)"
if printf '%s' "$response" | grep -q '"status":"ok"'; then
  rm -f "$STATE_FILE"
  echo "[enhe-health-watch] ok"
  exit 0
fi

now="$(date +%s)"
last_alert="0"
if [ -f "$STATE_FILE" ]; then
  last_alert="$(cat "$STATE_FILE" 2>/dev/null || echo 0)"
fi

elapsed=$((now - last_alert))
if [ "$elapsed" -lt "$ALERT_INTERVAL_SECONDS" ]; then
  echo "[enhe-health-watch] unhealthy, alert suppressed: $response" >&2
  exit 1
fi

printf '%s' "$now" > "$STATE_FILE"
echo "[enhe-health-watch] unhealthy, sending alert: $response" >&2

docker exec -i \
  -e ENHE_HEALTH_URL="$HEALTH_URL" \
  -e ENHE_HEALTH_ERROR="$response" \
  -e ENHE_HEALTH_CHECKED_AT="$(date '+%Y-%m-%d %H:%M:%S %z')" \
  enhe-ai-tools-app node <<'NODE'
const nodemailer = require("nodemailer");

function recipients() {
  const value = process.env.ADMIN_ALERT_EMAILS || process.env.ADMIN_ALERT_EMAIL || "huqingwei5942@gmail.com";
  return value.split(/[;,]/).map((item) => item.trim()).filter(Boolean);
}

async function main() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 0);
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!host || !port || !from || !recipients().length) {
    console.error("[enhe-health-watch] SMTP is not configured, cannot send alert email");
    process.exit(0);
  }

  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: process.env.SMTP_USER && process.env.SMTP_PASSWORD
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined
  });

  const subject = "[ENHE AI] 站点健康检查异常";
  const lines = [
    `检查时间：${process.env.ENHE_HEALTH_CHECKED_AT || new Date().toISOString()}`,
    `检查地址：${process.env.ENHE_HEALTH_URL || ""}`,
    `异常响应：${process.env.ENHE_HEALTH_ERROR || ""}`,
    `后台入口：${(process.env.NEXT_PUBLIC_APP_URL || "https://www.enhe-tech.com.cn").replace(/\/+$/, "")}/admin`
  ];

  await transporter.sendMail({
    from,
    to: recipients(),
    subject,
    text: lines.join("\n"),
    html: `<div style="font-family:Arial,'Microsoft YaHei',sans-serif;line-height:1.7;color:#0f172a"><h2>${subject}</h2><pre style="white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;padding:12px">${lines.join("\n")}</pre></div>`,
    encoding: "utf-8",
    textEncoding: "base64",
    headers: { "Content-Language": "zh-CN" }
  });
}

main().catch((error) => {
  console.error("[enhe-health-watch] failed to send alert email", error);
  process.exit(1);
});
NODE

exit 1
