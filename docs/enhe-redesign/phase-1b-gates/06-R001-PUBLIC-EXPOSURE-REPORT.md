R001_PUBLIC_SHELL_CODE_BOUNDARY=PASS
R001_PUBLIC_WEB_EXPOSURE_SCAN=FAIL_AT_OBSERVED_TIME
R001_PRODUCTION_FILE_INVENTORY=OPEN
R001_PRODUCT_DETAIL_AND_DOWNLOAD=BLOCKED

# R-001 public/private file boundary evidence

## Code boundary

Read-only source scans found no `fileUrl`, `filePath`, `objectKey`, `downloadUrl`, `signedUrl`, or `downloadFile` reads in the shared public shell, homepage shell, public listing shell, footer, header, or product card. Public listings use `getPublicToolListing` without a File relation. The product-detail shell is different: `src/app/tools/[slug]/page-shell.tsx` includes `downloadFile` and passes `fileUrl ?? filePath` through `getDownloadLinkContent` (`src/lib/tool-download-link.ts`), with a conditional HTML/href output. The protected API route is `src/app/api/tools/[id]/download/route.ts`; access checks are in `src/lib/access.ts`, but the detail-page side channel remains.

The actual upload route is `src/app/api/uploads/[fileName]/route.ts` (single segment). It reads a disk file anonymously and returns `public, max-age=31536000, immutable`; this is recorded as a production-drift question, not changed here.

### Route-to-file matrix

| surface | source | file/delivery fields observed | boundary result |
|---|---|---|---|
| shared public shell, header, footer, homepage, listing, product card | public shell components and `src/lib/public-content.ts` | no `File` relation, `fileUrl`, `filePath`, `objectKey`, `downloadUrl`, `signedUrl`, or `downloadFile` read | `PASS` for the observed public-shell boundary |
| product detail | `src/app/tools/[slug]/page-shell.tsx` and `src/lib/tool-download-link.ts` | `downloadFile`, `fileUrl ?? filePath`, and derived download-link content can reach rendered text/href | `BLOCKED` pending entitlement-safe redesign |
| protected download entry | `src/app/api/tools/[id]/download/route.ts` and `src/lib/access.ts` | access check and secure-link resolver are present; this is not a public-shell surface | protected route observed; production object classification remains open |
| local upload route | `src/app/api/uploads/[fileName]/route.ts` | anonymous disk read; `public, max-age=31536000, immutable` response | `CODE_PRODUCTION_DRIFT` / requires production proxy and file inventory |
| public HTML/RSC/JSON-LD probes | observed page responses | no literal field-name tokens, but 17 hash-only public value observations | `FAIL_AT_OBSERVED_TIME` |

The local route inventory's `private` label describes intended indexability/surface classification, not proof of authentication. In particular, the upload route's anonymous GET and cache headers are retained as a separate production-drift finding above.

### Static boundary test plan

Before public-shell implementation, add a static assertion over the shared shell, homepage, listing and card source files: fail if they import a `File` relation or read `fileUrl`, `filePath`, `objectKey`, `downloadUrl`, `signedUrl`, or `downloadFile`; allow only an explicitly named public-asset DTO. Run the assertion in the existing test harness after each public-shell change and pair it with anonymous HTML/RSC probes. This audit performed the same rule as a read-only source scan; it did not connect a new R-001 test to production behavior.

## Public web observation

The 528 sitemap pages were checked without authentication. No literal field-name tokens (`fileUrl`, `filePath`, `objectKey`, `downloadUrl`, `signedUrl`) appeared in the sampled HTML/RSC field-token scan, and no `/uploads` delivery page or signed-reference page was observed. Value-level scanning nevertheless found 17 unique, hash-only address observations across seven public pages: COS object references, permanent Baidu/Quark share addresses, and two external GitHub archive source references. A separate parser false positive (one ENHE public media URL whose query contains a COS source string) is included in the CSV but excluded from the failure count.

The affected product/detail pages return HTTP 200 and public shared-cache headers (`public, s-maxage=300, stale-while-revalidate=86400`). Two pages expose permanent share values in HTML href and visible text; other values occur in RSC payloads even when not visible in the initial HTML. HEAD probes were metadata-only; no archive or package body was downloaded.

See `07-R001-PUBLIC-EXPOSURE-SCAN.csv` for the redacted matrix. Hashes identify observations without reproducing private or delivery URLs.

## Split gate decision

`R001_PUBLIC_SHELL_CODE_BOUNDARY=PASS` is limited to the observed source boundary. `R001_PUBLIC_WEB_EXPOSURE_SCAN=FAIL_AT_OBSERVED_TIME` because value-level addresses are publicly discoverable. Without production File metadata, `R001_PRODUCTION_FILE_INVENTORY=OPEN` and `R001_PRODUCT_DETAIL_AND_DOWNLOAD=BLOCKED`. These observations do not prove every address is a paid package; the File inventory is required to classify ownership and entitlement safely.
