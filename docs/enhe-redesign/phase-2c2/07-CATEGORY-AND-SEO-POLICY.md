# Category and SEO policy

Seven approved category choices are shared by both locales. The default all-products state uses no category parameter.

- Valid category queries render server-filtered products.
- category=all is accepted as the default content state but still receives the parameterized-page policy.
- Invalid categories return a hard 404; they do not create an empty soft 404.
- Any category-parameter URL is noindex, follow and canonicalizes to the locale's base software path.
- Category and pagination parameter URLs are absent from the sitemap; the sitemap URL set is unchanged.
- Page 1 and later-page canonicals are self-canonical. Later-page hreflang output is deliberately conservative and does not invent an unverified translated page relationship.

The client selector separates focused and committed state. Enter and Space commit a choice, arrow keys move focus, Escape closes the mobile sheet, and visible focus, reduced motion, mobile dismissal, and route-aware language switching were browser-verified.
