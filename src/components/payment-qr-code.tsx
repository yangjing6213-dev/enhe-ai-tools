import React from "react";
import { QRCodeSVG } from "qrcode.react";

type PaymentQrCodeProps = {
  value: string;
  label: string;
};

export function PaymentQrCode({ value, label }: PaymentQrCodeProps) {
  return (
    <QRCodeSVG
      value={value}
      size={248}
      level="M"
      includeMargin
      role="img"
      aria-label={label}
    />
  );
}
