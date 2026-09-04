import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string) {
  return `¥${Number(value).toFixed(2)}`;
}

export function maskEmail(email?: string | null) {
  if (!email) return "未绑定邮箱";
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}***@${domain}`;
}
