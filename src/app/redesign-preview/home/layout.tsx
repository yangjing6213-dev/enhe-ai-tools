import type { Metadata } from "next";
import "@/styles/redesign/tokens.css";
import "@/styles/redesign/shell.css";
import "@/styles/redesign/home.css";

export const metadata: Metadata = {
  title: "ENHE Homepage Preview",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    noimageindex: true,
  },
};

export default function RedesignHomePreviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
