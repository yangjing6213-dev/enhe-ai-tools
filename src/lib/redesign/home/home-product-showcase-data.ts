import { getSettingsMap } from "@/lib/settings";
import {
  createDefaultHomeProductShowcase,
  HOME_PRODUCT_SHOWCASE_SETTING_KEY,
  parseHomeProductShowcaseConfig,
} from "@/lib/redesign/home/home-product-showcase";

export { HOME_PRODUCT_SHOWCASE_SETTING_KEY };

export async function getHomeProductShowcase() {
  const settings = await getSettingsMap();
  return parseHomeProductShowcaseConfig(settings[HOME_PRODUCT_SHOWCASE_SETTING_KEY]) ?? createDefaultHomeProductShowcase();
}
