type TextFieldDescription = {
  tagName: string;
  type?: string;
  name?: string;
  id?: string;
  disabled?: boolean;
  readOnly?: boolean;
  pattern?: string;
  inputMode?: string;
  autocomplete?: string;
  placeholder?: string;
  dataset?: { emojiPicker?: string };
};

export function isOrdinaryTextField(field: TextFieldDescription) {
  if (!["INPUT", "TEXTAREA"].includes(field.tagName) || field.disabled || field.readOnly || field.dataset?.emojiPicker === "off") return false;
  if (field.tagName === "INPUT" && !["text", "search"].includes(field.type || "text")) return false;
  if (field.pattern || ["email", "url", "tel", "numeric", "decimal"].includes(field.inputMode || "")) return false;
  if (/password|one-time-code|email|tel|cc-|bday/.test(field.autocomplete || "")) return false;
  const identity = `${field.name || ""} ${field.id || ""}`.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
  if (/(?:^|[\s_-])(?:id|ids|slug|url|uri|email|phone|tel|password|pass|token|secret|key|code|license|machine|iban|date|time|port|src|href|path|image|avatar|filename|version|hash|endpoint|json|css|html)(?:$|[\s_-])/.test(identity)) return false;
  const isSearch = field.type === "search" || /(?:^|[\s_-])(?:q|query|search)(?:$|[\s_-])/.test(identity);
  return isSearch || !/https?:\/\/|邮箱|手机号|电话|网址|域名|令牌|密钥|密码|授权码|机器码|\b(?:email|url)\b/i.test(field.placeholder || "");
}

export function insertEmojiAtCaret(value: string, start: number | null, end: number | null, token: string, maxLength = -1) {
  const selectionStart = Math.max(0, Math.min(value.length, start ?? value.length));
  const selectionEnd = Math.max(selectionStart, Math.min(value.length, end ?? selectionStart));
  const nextValue = value.slice(0, selectionStart) + token + value.slice(selectionEnd);
  if (maxLength >= 0 && nextValue.length > maxLength) return null;
  return { value: nextValue, caret: selectionStart + token.length };
}
