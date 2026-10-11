const maxAvatarFileBytes = 700 * 1024;

const avatarSignatures = {
  "image/png": {
    extension: ".png",
    matches: (bytes: Uint8Array) =>
      bytes.length >= 8 &&
      bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 &&
      bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10
  },
  "image/jpeg": {
    extension: [".jpg", ".jpeg"],
    matches: (bytes: Uint8Array) => bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
  },
  "image/webp": {
    extension: ".webp",
    matches: (bytes: Uint8Array) =>
      bytes.length >= 12 &&
      bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70 &&
      bytes[8] === 87 && bytes[9] === 69 && bytes[10] === 66 && bytes[11] === 80
  }
} as const;

export const MAX_AVATAR_FILE_BYTES = maxAvatarFileBytes;

export async function isValidAvatarFile(file: File): Promise<boolean> {
  if (file.size === 0 || file.size > maxAvatarFileBytes) return false;

  const signature = avatarSignatures[file.type as keyof typeof avatarSignatures];
  if (!signature) return false;

  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const allowedExtensions = Array.isArray(signature.extension) ? signature.extension : [signature.extension];
  if (!allowedExtensions.includes(extension as never)) return false;

  return signature.matches(new Uint8Array(await file.slice(0, 12).arrayBuffer()));
}
