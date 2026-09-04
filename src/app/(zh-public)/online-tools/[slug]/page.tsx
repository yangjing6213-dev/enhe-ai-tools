import { permanentRedirect } from "next/navigation";

export const revalidate = 300;

export default async function LegacyOnlineToolDetailRedirectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  permanentRedirect(`/account-services/${slug}`);
}
