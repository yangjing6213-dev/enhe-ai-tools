import { createMissingPageResponse } from "@/lib/missing-page-response";

export const dynamic = "force-dynamic";

export function GET() {
  return createMissingPageResponse("zh");
}
