import { permanentRedirect } from "next/navigation";

export const revalidate = 300;

export default function OnlineToolsRedirectPage() {
  permanentRedirect("/account-services");
}
