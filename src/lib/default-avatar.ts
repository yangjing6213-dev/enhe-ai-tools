export const DEFAULT_AVATAR_COUNT = 20;

export type AvatarGender = "male" | "female" | "unspecified";
export const GENDER_AVATAR_COUNTS = { male: 12, female: 9 } as const;

export function getDefaultAvatar(seed: string, gender: AvatarGender = "unspecified") {
  let hash = 0;
  for (const character of seed) hash = (Math.imul(hash, 31) + character.codePointAt(0)!) >>> 0;
  const count = gender === "unspecified" ? DEFAULT_AVATAR_COUNT : GENDER_AVATAR_COUNTS[gender];
  const folder = gender === "unspecified" ? "" : `${gender}/`;
  return `/images/user-avatars/${folder}avatar-${String(hash % count + 1).padStart(2, "0")}.webp`;
}
