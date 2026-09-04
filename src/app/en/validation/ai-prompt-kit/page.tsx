import { PublicSiteChrome } from "@/components/public-site-chrome";
import {
  generateValidationAiPromptKitMetadata,
  ValidationAiPromptKitPage
} from "@/components/validation-ai-prompt-kit-page";

export const revalidate = 300;

export async function generateMetadata() {
  return generateValidationAiPromptKitMetadata("en");
}

export default async function EnglishAiPromptKitValidationPage() {
  return (
    <PublicSiteChrome forceLocale="en">
      <ValidationAiPromptKitPage locale="en" />
    </PublicSiteChrome>
  );
}
