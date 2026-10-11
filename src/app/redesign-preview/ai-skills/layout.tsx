import type { Metadata } from "next";

import "@/styles/redesign/tokens.css";
import "@/styles/redesign/shell.css";
import "@/styles/redesign/software.css";
import "@/styles/redesign/site-refresh.css";

export const metadata: Metadata = {
  title: "ENHE AI Skill Preview",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    noimageindex: true,
  },
};

export default function AiSkillsPreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  );
}
