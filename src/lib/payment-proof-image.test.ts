import { describe, expect, it } from "vitest";
import { getPaymentProofImageSrc, isRenderablePaymentProofImage } from "@/lib/payment-proof-image";

describe("getPaymentProofImageSrc", () => {
  it("routes COS proof images through the protected image endpoint", () => {
    expect(getPaymentProofImageSrc({ id: "proof-1", proofImage: "cos://bucket/payment-proofs/a.png" })).toBe(
      "/api/payment-proofs/proof-1/image"
    );
  });

  it("routes local and legacy public proofs through ownership checks", () => {
    expect(getPaymentProofImageSrc({ id: "proof-1", proofImage: "/uploads/proof.png" })).toBe("/api/payment-proofs/proof-1/image");
    expect(getPaymentProofImageSrc({ id: "proof-1", proofImage: "https://cdn.example/proof.png" })).toBe(
      "/api/payment-proofs/proof-1/image"
    );
  });

  it("does not expose a private local disk path", () => {
    expect(getPaymentProofImageSrc({ id: "proof-1", proofImage: "private-uploads/payment-proofs/proof.png" })).toBe("/api/payment-proofs/proof-1/image");
  });

  it("treats protected proof image routes as renderable images", () => {
    expect(isRenderablePaymentProofImage("/api/payment-proofs/proof-1/image")).toBe(true);
    expect(isRenderablePaymentProofImage("/orders/proof-1")).toBe(false);
  });
});
