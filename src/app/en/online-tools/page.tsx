import { permanentRedirect } from "next/navigation";

export const revalidate = 300;

export default function EnglishOnlineToolsRedirectPage() {
  permanentRedirect("/en/account-services");
}
