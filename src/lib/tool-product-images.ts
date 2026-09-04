export function mergeToolProductImages(existingImages: string[], uploadedImages: string[]) {
  const seen = new Set<string>();
  return [...existingImages, ...uploadedImages]
    .map((image) => image.trim())
    .filter((image) => {
      if (!image || seen.has(image)) return false;
      seen.add(image);
      return true;
    });
}
