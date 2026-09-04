import "../globals.css";
import { RootDocument, sharedRootMetadata } from "@/app/root-layout-shared";

export const metadata = sharedRootMetadata;

export default function AiApiLayout({ children }: { children: React.ReactNode }) {
  return <RootDocument lang="zh-CN">{children}</RootDocument>;
}
