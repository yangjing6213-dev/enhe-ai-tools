import "../globals.css";
import "@/styles/redesign/tokens.css";
import "@/styles/redesign/shell.css";
import "@/styles/redesign/home.css";
import { headers } from "next/headers";
import { RootDocument, sharedRootMetadata } from "@/app/root-layout-shared";

export const metadata = sharedRootMetadata;

function isEnglishPublicPath(pathname: string) {
  return (
    (pathname === "/en" || pathname.startsWith("/en/")) &&
    !pathname.startsWith("/en/login") &&
    !pathname.startsWith("/en/register") &&
    !pathname.startsWith("/en/user")
  );
}

export default async function EnglishLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-enhe-pathname") ?? "/en";

  return (
    <RootDocument lang="en-US" disableLegacyVisualEffects={isEnglishPublicPath(pathname)}>
      {children}
    </RootDocument>
  );
}
