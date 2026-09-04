import type { Metadata } from "next";
import { ReferralsPage } from "@/features/enhe-api/components/console-pages";

export const metadata: Metadata = {
  title: "推荐奖励 | ENHE API"
};

export default function UserApiReferralsPage() {
  return <ReferralsPage />;
}
