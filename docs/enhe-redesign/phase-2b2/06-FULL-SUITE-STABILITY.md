# Full Suite Stability

All results below were collected after the isolated media-loading correction commit.

## Default suite

Three consecutive runs of the default suite completed with exit code 0. Each run reported:

- Test files: **443 passed**, **9 skipped**, 452 total
- Tests: **2142 passed**, **90 skipped**, 2232 total

## Shuffle suite

The required shuffle seeds also completed with exit code 0:

| Seed | Result |
|---|---|
| 21101 | 443 passed / 9 skipped files; 2142 passed / 90 skipped tests |
| 21102 | 443 passed / 9 skipped files; 2142 passed / 90 skipped tests |
| 21103 | 443 passed / 9 skipped files; 2142 passed / 90 skipped tests |

The suite emitted pre-existing non-fatal diagnostic messages for skipped/failed external integrations (for example SMTP unavailable and Baidu push skipped). They did not alter the zero exit status.

