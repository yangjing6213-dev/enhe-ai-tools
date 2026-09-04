export function createOrderNo(date = new Date(), random = Math.random()) {
  const pad = (value: number) => value.toString().padStart(2, "0");
  const timestamp = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join("");
  const suffix = Math.floor(random * 1_000_000)
    .toString()
    .padStart(6, "0");
  return `ENHE${timestamp}${suffix}`;
}
