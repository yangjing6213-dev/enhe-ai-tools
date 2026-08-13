import type { Metadata } from "next";
import "@/styles/redesign/tokens.css";
import "@/styles/redesign/shell.css";

export const metadata: Metadata = {
  title: "ENHE public shell candidate preview",
  robots: "noindex, nofollow",
};

export default function RedesignPreviewLayout({ children }: { children: React.ReactNode }) {
  return <div className="enhe-redesign-preview">{children}</div>;
}
