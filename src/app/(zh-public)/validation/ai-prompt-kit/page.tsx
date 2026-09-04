import { PublicSiteChrome } from "@/components/public-site-chrome";
import {
  generateValidationAiPromptKitMetadata,
  ValidationAiPromptKitPage
} from "@/components/validation-ai-prompt-kit-page";

export const revalidate = 300;

export async function generateMetadata() {
  return generateValidationAiPromptKitMetadata("zh");
}

export default async function AiPromptKitValidationPage() {
  return (
    <PublicSiteChrome forceLocale="zh">
      <ValidationAiPromptKitPage locale="zh" />
    </PublicSiteChrome>
  );
}
