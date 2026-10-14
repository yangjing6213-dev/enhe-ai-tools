import { createHash } from "node:crypto";

export const FORUM_TOPIC_TIME_ZONE = "Asia/Shanghai";
const FIRST_MINUTE = 9 * 60;
const MINUTES_PER_DAY_WINDOW = 12 * 60;

export function getShanghaiForumClock(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: FORUM_TOPIC_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    minute: Number(values.hour) * 60 + Number(values.minute),
  };
}

export function getDailyAiForumTopicMinute(localDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
    throw new Error("INVALID_FORUM_TOPIC_DATE");
  }
  const digest = createHash("sha256").update(`enhe-ai-forum:${localDate}`).digest();
  return FIRST_MINUTE + (digest.readUInt32BE(0) % MINUTES_PER_DAY_WINDOW);
}

export function isDailyAiForumTopicDue(date = new Date()) {
  const clock = getShanghaiForumClock(date);
  return {
    ...clock,
    scheduledMinute: getDailyAiForumTopicMinute(clock.date),
    due: clock.minute >= getDailyAiForumTopicMinute(clock.date),
  };
}
