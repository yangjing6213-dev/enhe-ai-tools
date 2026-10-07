import type { Metadata } from "next";
import {
  EnheRedesignPublicFooter,
  EnheRedesignPublicHeader,
} from "@/components/redesign/enhe-production-public-shell";

export const metadata: Metadata = {
  title: "Sign in to ENHE AI for purchases, downloads, and learning",
  robots: {
    index: false,
    follow: true,
  },
};

export default async function EnglishAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="enhe-redesign-production" lang="en">
      <a className="redesign-skip-link" href="#main-content">Skip to main content</a>
      <EnheRedesignPublicHeader locale="en" />
      <div id="main-content" tabIndex={-1}>
        <div className="fade-in">{children}</div>
      </div>
      <EnheRedesignPublicFooter locale="en" />
    </div>
  );
}
