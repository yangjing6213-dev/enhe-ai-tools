# ENHE local security patch

This package is a private local derivative of the MIT-licensed `braces@3.0.3` npm release. The original license and attribution are retained.

It adds a fixed maximum nesting depth of 100 for brace/parenthesis parsing and for recursive `compile`, `expand`, and `stringify` operations. Inputs or syntax trees beyond that limit throw a bounded-depth error instead of recursing without a limit. The local package version is `3.0.4-enhe.0`; it is not an upstream release.

The change addresses GitHub-reviewed advisory [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). Remove this local fork after a patched upstream release is available and the full dependency tree and consumers have been verified against it.
