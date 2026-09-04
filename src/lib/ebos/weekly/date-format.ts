function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function formatLocalDate(value: Date) {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

export function formatLocalDateTime(value: Date) {
  return `${formatLocalDate(value)} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
}

