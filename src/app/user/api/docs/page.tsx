import type { Metadata } from "next";
import { DocsHubPage } from "@/features/enhe-api/components/docs-hub";

export const metadata: Metadata = {
  title: "配置文档 | ENHE API"
};

export default function UserApiDocsPage() {
  return <DocsHubPage />;
}
