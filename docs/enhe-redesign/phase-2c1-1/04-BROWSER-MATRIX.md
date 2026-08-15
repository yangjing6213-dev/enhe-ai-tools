# Production browser matrix

Formal routes were checked with Playwright against the local production-wiring adapter at `/` and `/en`. Preview routes were not used as acceptance evidence.

| Locale | Viewport | Header | Hero top | Spacer padding | Contrast | Overflow | Responsive state |
| --- | ---: | --- | ---: | ---: | ---: | --- | --- |
| zh | 1440x900 | visible, 73px | y=73px | 0px | 19.69:1 | 1440/1440 | desktop nav visible |
| zh | 390x844 | visible, 73px | y=73px | 0px | 19.69:1 | 390/390 | mobile menu visible |
| en | 1440x900 | visible, 73px | y=73px | 0px | 19.69:1 | 1440/1440 | desktop nav visible |
| en | 390x844 | visible, 73px | y=73px | 0px | 19.69:1 | 390/390 | mobile menu visible |

Additional acceptance checks passed:

- 320px narrow viewport: pass.
- 200%-equivalent zoom layout: pass.
- Keyboard focus ring: pass.
- Reduced-motion review state: stable.
- Signed user account-menu snapshot: pass.
- Page errors: `[]`.
- Console errors: `[]`.
- No Preview/Candidate marker in the formal production-route assertions.

The test harness removed one `<nextjs-portal>` dev-tools node before saving screenshots so the local development overlay could not contaminate visual evidence. This is test-environment chrome, not application DOM. The application support widget remains part of the production shell and is visible in the screenshots.

## Screenshot links

- [Chinese desktop](screenshots/zh-home-production-wired-fixed-1440.png)
- [Chinese mobile](screenshots/zh-home-production-wired-fixed-390.png)
- [English desktop](screenshots/en-home-production-wired-fixed-1440.png)
- [English mobile](screenshots/en-home-production-wired-fixed-390.png)

