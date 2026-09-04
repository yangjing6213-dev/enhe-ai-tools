import { normalizeImageSrc } from "@/lib/media";
import { parseCosFilePath } from "@/lib/storage";

export type PaymentProofImageRef = {
  id: string;
  proofImage: string | null;
};

export function getPaymentProofImageSrc(proof: PaymentProofImageRef | null | undefined) {
  if (!proof?.proofImage) return null;
  if (parseCosFilePath(proof.proofImage)) return `/api/payment-proofs/${proof.id}/image`;
  return normalizeImageSrc(proof.proofImage);
}

export function isRenderablePaymentProofImage(src: string) {
  return src.startsWith("/api/payment-proofs/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(src.split("?")[0] ?? "");
}
