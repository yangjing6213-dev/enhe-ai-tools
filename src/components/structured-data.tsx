import { stringifyStructuredData } from "@/lib/seo";

export function StructuredData({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: stringifyStructuredData(Array.isArray(data) ? { "@graph": data } : data) }} />;
}
