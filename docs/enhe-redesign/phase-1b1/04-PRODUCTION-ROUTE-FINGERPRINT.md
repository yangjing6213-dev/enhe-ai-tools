# Production route and Next build fingerprint

PRODUCTION_ROUTE_FINGERPRINT_STATUS=COLLECTED
APP_CONTAINER_DISCOVERY=COMPOSE_LABEL_EXACT_ONE
DB_CONTAINER_DISCOVERY=COMPOSE_LABEL_EXACT_ONE
PRODUCTION_ROUTE_KEY_COUNT=166
PRODUCTION_ROUTE_KEY_SET_SHA256=41bcf418bd3827296984eb2671553a3e1028e7d8fd543acce09fe4f4163864a4
AUTHORITATIVE_SOURCE_ROUTE_PATTERN_COUNT=162

| runtime artifact | exists | relative path | SHA-256 |
|---|---|---|---|
| app paths manifest | YES | `.next/server/app-paths-manifest.json` | `4ca1b3037958d6c8d3f850f10aa77ae1f28facfc10805e1683f37966312369b4` |
| routes manifest | YES | `.next/routes-manifest.json` | `3fefc3c934fa06a753fb613cc441d448f5a12a9531e88951ab2e5a7a1c2d73d4` |
| middleware manifest | YES | `.next/server/middleware-manifest.json` | `61c56b3190a2048e1bfd691917db8a8ceab232f7a5cfe19cbde6ab0620277cac` |
| required server files | YES | `.next/required-server-files.json` | `cc34af07512f269deefaea6d49078a3c3f643f19cfe63f79198834c1f9cd53bc` |
| standalone server | NO | — | — |

`NEXT_BUILD_ID=BdhxhGCVCJYc9NF968ywC`.

Manifest bodies and deployed source bodies were not output. The 166 route keys were sorted and hashed inside the app container; only the count and set hash left production. The 162 source route patterns were derived locally from the authoritative commit without checkout or fetch.
