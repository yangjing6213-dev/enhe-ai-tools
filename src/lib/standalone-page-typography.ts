export type StandalonePageLocale = "zh" | "en";

const fontFiles = {
  oppo: "/fonts/oppo-sans-4/oppo-sans-4.0-4f58dbaeaea7.ttf",
  misansRegular: "/fonts/misans-latin/MiSansLatin-Regular-fc17182f3f2b.woff2",
  misansSemibold: "/fonts/misans-latin/MiSansLatin-Semibold-8d81deaf1c0f.woff2",
  misansBold: "/fonts/misans-latin/MiSansLatin-Bold-9dfe63a0d0b3.woff2",
} as const;

export function standalonePageTypographyMarkup(locale: StandalonePageLocale) {
  if (locale === "zh") {
    return `<link rel="preload" href="${fontFiles.oppo}" as="font" type="font/ttf" crossorigin="anonymous"><style>@font-face{font-family:"OPPO Sans 4.0";src:url("${fontFiles.oppo}") format("truetype");font-style:normal;font-weight:100 700;font-display:swap;}html,body{font-family:"OPPO Sans 4.0","Microsoft YaHei",Arial,sans-serif!important;}</style>`;
  }

  return `<link rel="preload" href="${fontFiles.misansRegular}" as="font" type="font/woff2" crossorigin="anonymous"><style>@font-face{font-family:"MiSans";src:url("${fontFiles.misansRegular}") format("woff2");font-style:normal;font-weight:330;font-display:swap;}@font-face{font-family:"MiSans";src:url("${fontFiles.misansSemibold}") format("woff2");font-style:normal;font-weight:520;font-display:swap;}@font-face{font-family:"MiSans";src:url("${fontFiles.misansBold}") format("woff2");font-style:normal;font-weight:630;font-display:swap;}html,body{font-family:"MiSans","OPPO Sans 4.0",Arial,sans-serif!important;}</style>`;
}

export function injectStandalonePageTypography(html: string, locale: StandalonePageLocale) {
  const head = /<head(?:\s[^>]*)?>/i;
  if (!head.test(html)) return html;
  return html.replace(head, (openingTag) => `${openingTag}${standalonePageTypographyMarkup(locale)}`);
}
