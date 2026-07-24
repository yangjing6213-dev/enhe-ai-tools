import {
  generateProductPathMetadata,
  ProductPathPageShell,
} from "@/app/product-paths/[slug]/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return generateProductPathMetadata(slug, "zh");
}

export default async function ProductPathPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <PublicSiteChrome forceLocale="zh">
      <ProductPathPageShell slug={slug} forceLocale="zh" />
    </PublicSiteChrome>
  );
}
