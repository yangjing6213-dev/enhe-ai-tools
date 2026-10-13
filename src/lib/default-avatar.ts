export const DEFAULT_AVATAR_COUNT = 20;

export function getDefaultAvatar(seed: string) {
  let hash = 0;
  for (const character of seed) hash = (Math.imul(hash, 31) + character.codePointAt(0)!) >>> 0;
  return `/images/user-avatars/avatar-${String(hash % DEFAULT_AVATAR_COUNT + 1).padStart(2, "0")}.webp`;
}
