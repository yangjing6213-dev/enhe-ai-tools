import type { Metadata } from "next";
import { BillingPage } from "@/features/enhe-api/components/console-pages";

export const metadata: Metadata = {
  title: "套餐与账单 | ENHE API"
};

export default function UserApiBillingPage() {
  return <BillingPage />;
}
