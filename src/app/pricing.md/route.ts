import {
  getPricingOfferItems,
  renderPricingMarkdown,
} from "@/lib/pricing-offers";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await getPricingOfferItems("en");

  return new Response(renderPricingMarkdown(items), {
    headers: {
      "cache-control": "public, s-maxage=300, stale-while-revalidate=300",
      "content-language": "en-US",
      "content-type": "text/markdown; charset=utf-8",
    },
  });
}
