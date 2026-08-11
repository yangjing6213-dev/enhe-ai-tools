# Sign-in contract

The default surface is warm white with a 400–440px centered form and no large card. It shows only the logo and locale in the shell. Chinese defaults are `欢迎来到 ENHE AI`, `一站式AI平台`, `使用 Google 继续`, `使用 GitHub 继续`, `或`, `电子邮箱`, `继续`, and a visible sentence linking `用户协议` and `隐私政策`. English mirrors this as `Welcome to ENHE AI.`, `The All-in-One AI Platform.`, provider buttons, `or`, `Email address`, `Continue`, and the approved terms sentence.

Both language versions place a 20px local inline SVG at the left of the Google and GitHub button text. Icons are `aria-hidden=true`; the full visible button text remains the accessible name. The SVGs load no CDN resource, keep the existing 48px button height and focus states, and do not imply or invoke a real OAuth integration. No OAuth call or diagnostic state is exposed.
