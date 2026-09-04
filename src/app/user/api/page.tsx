import type { Metadata } from "next";
import { ConsoleOverviewPage } from "@/features/enhe-api/components/console-pages";

export const metadata: Metadata = {
  title: "ENHE API 控制台 | ENHE AI"
};

export default function UserApiPage() {
  return <ConsoleOverviewPage />;
}
