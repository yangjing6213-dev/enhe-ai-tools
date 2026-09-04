import "../globals.css";
import { RootDocument, sharedRootMetadata } from "@/app/root-layout-shared";

export const metadata = sharedRootMetadata;

export default function ZhPublicRootLayout({ children }: { children: React.ReactNode }) {
  return <RootDocument lang="zh-CN">{children}</RootDocument>;
}
