R001_OWNER_DECISION_STATUS=REQUIRED
R001_OWNER_DECISION_ROW_COUNT=15
R001_HASH_MATCH_COUNT=4

# R-001 owner classification queue

The table below contains no address. `FREE_PUBLIC_RESOURCE_CANDIDATE` is not approval: a product/content owner must still confirm public intent, entitlement behavior, caching, and delivery policy.

| page | product/content | content type | production database state | paid state | current candidates | suggested action |
|---|---|---|---|---|---:|---|
| `/ai-skills/a-skill` | A Skill | six COS media observations | Tool is published; expected Tool row exists; no File/Tutorial row; observed hashes did not match permitted fields | Tool is download-paid, price `19.90` | 6 unknown | Owner must distinguish intentional public media from paid-delivery material; do not infer from the paid product flag alone. |
| `/ai-skills/seo-geo-skill` | SEO/GEO Skill | one COS archive observation | Tool is published; no matching File/Tutorial hash | Tool free flag, price `0.00` | 1 unknown | Trace the archive source and approve or contain it. |
| `/skill-learning/ai-monetization-side-hustle-course` | AI monetization side-hustle course | one permanent cloud-share observation | No Tool row found under the public slug; no permitted content-field hash match | unknown | 1 unknown | Content owner must identify the current/legacy source and disposition. |
| `/software/codex-api` | Codex API | two permanent cloud-share observations | Tool is published with one File; one unique observation matched both `file_path` and `file_url`; one observation did not match | Tool/File relation reports free flag, price `0.00` | 1 free candidate, 1 unknown | Confirm whether the matched File is intentionally public; trace the unmatched value separately. |
| `/software/zfb-transfer-link-qr-code-generator` | transfer-link QR generator | four permanent cloud-share observations | One unique observation matched both File address fields on published Tool slug `zfb`; three did not match | Tool/File relation reports free flag, price `0.00` | 1 free candidate, 3 unknown | Confirm public intent for the matched File and trace the three unmatched values. |
| `/tutorials` | tutorial listing/content | one permanent cloud-share observation | No hash match in public Tutorial/Tool/File/FAQ/changelog fields | unknown | 1 unknown | Tutorial/content owner must identify the source before approval or containment. |

## Closed without owner delivery approval

- Two NewsExternalSource hashes matched production external-source rows and remain `EXTERNAL_SOURCE`.
- One own-site media-query observation remains `PARSER_FALSE_POSITIVE`; it did not require a database match.

## Owner response needed

For each of the 15 queued observations, approve exactly one outcome: intentional public media, intentional free public resource, paid delivery leak, legacy delivery leak, or unresolved. Approval must name an owner and a verification check. This phase does not remove or alter any link.
