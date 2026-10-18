export type PaymentProofImageRef = {
  id: string;
  proofImage: string | null;
};

export function getPaymentProofImageSrc(proof: PaymentProofImageRef | null | undefined) {
  if (!proof?.proofImage) return null;
  return `/api/payment-proofs/${encodeURIComponent(proof.id)}/image`;
}

export function isRenderablePaymentProofImage(src: string) {
  return src.startsWith("/api/payment-proofs/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(src.split("?")[0] ?? "");
}
