export const CREATOR_MESSAGE_DAILY_LIMIT = 5;
export const CREATOR_MESSAGE_MIN_LENGTH = 2;
export const CREATOR_MESSAGE_MAX_LENGTH = 1000;

export function normalizeCreatorMessage(value: FormDataEntryValue | string | null) {
  if (typeof value !== "string") return null;
  const message = value.trim();
  if (
    message.length < CREATOR_MESSAGE_MIN_LENGTH ||
    message.length > CREATOR_MESSAGE_MAX_LENGTH
  ) {
    return null;
  }
  return message;
}

export function hasReachedCreatorMessageLimit(count: number) {
  return count >= CREATOR_MESSAGE_DAILY_LIMIT;
}
