import type { MetadataRoute } from "next";
import { defaultSiteDescription, siteName } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ENHE AI",
    short_name: siteName,
    description: defaultSiteDescription,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#22242a",
    theme_color: "#22242a",
    icons: [
      {
        src: "/icon-192.png?v=blue-mascot-20261015",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icon-512.png?v=blue-mascot-20261015",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
}
