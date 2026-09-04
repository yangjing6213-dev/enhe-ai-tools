import { permanentRedirect } from "next/navigation";

export const revalidate = 300;

export default async function LegacyEnglishOnlineToolDetailRedirectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  permanentRedirect(`/en/account-services/${slug}`);
}
