import "../globals.css";
import "@/styles/redesign/tokens.css";
import "@/styles/redesign/shell.css";
import "@/styles/redesign/home.css";
import { RootDocument, sharedRootMetadata } from "@/app/root-layout-shared";

export const metadata = sharedRootMetadata;

export default function ZhPublicRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <RootDocument lang="zh-CN" disableLegacyVisualEffects>
      {children}
    </RootDocument>
  );
}
