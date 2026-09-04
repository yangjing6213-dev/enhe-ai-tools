import "../globals.css";
import { RootDocument, sharedRootMetadata } from "@/app/root-layout-shared";

export const metadata = sharedRootMetadata;

export default function EnglishLayout({ children }: { children: React.ReactNode }) {
  return <RootDocument lang="en-US">{children}</RootDocument>;
}
