import { normalizeImageSrc } from "@/lib/media";
import { getSecureCosMediaUrl } from "@/lib/storage";

export async function resolveUserAvatarSrc(value?: string | null) {
  const avatar = value?.trim();
  if (!avatar) return null;

  try {
    const signedCosUrl = await getSecureCosMediaUrl(avatar);
    if (signedCosUrl) return signedCosUrl.toString();
  } catch {
    // The profile can still use a public image URL if COS signing is unavailable.
  }

  if (/^cos:\/\//i.test(avatar)) return null;
  return normalizeImageSrc(avatar);
}
