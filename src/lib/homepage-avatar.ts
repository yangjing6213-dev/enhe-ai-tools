import { createHash } from "node:crypto";

export function getHomepageAvatarVersion(source: string) {
  return createHash("sha256").update(source.trim()).digest("hex").slice(0, 16);
}

export function buildHomepageAvatarSrc(userId: string, source?: string | null) {
  const avatar = source?.trim();
  if (!avatar) return null;
  if (/^\/images\/user-avatars\/(?:male\/|female\/)?avatar-\d{2}\.webp$/.test(avatar)) return avatar;
  const params = new URLSearchParams({ id: userId, v: getHomepageAvatarVersion(avatar) });
  return `/api/homepage-avatars?${params}`;
}
