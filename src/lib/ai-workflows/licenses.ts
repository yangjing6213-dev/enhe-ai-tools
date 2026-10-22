const packageRedistributableLicenses = new Set([
  "0BSD",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "MIT",
  "MPL-2.0",
]);

const linkableOpenSourceLicenses = new Set([
  ...packageRedistributableLicenses,
  "AGPL-1.0-only",
  "AGPL-1.0-or-later",
  "AGPL-3.0",
  "AGPL-3.0-only",
  "AGPL-3.0-or-later",
  "Apache-1.1",
  "Artistic-2.0",
  "BSD-4-Clause",
  "BSL-1.0",
  "CC0-1.0",
  "CDDL-1.0",
  "CDDL-1.1",
  "EPL-1.0",
  "EPL-2.0",
  "EUPL-1.1",
  "EUPL-1.2",
  "GPL-1.0-only",
  "GPL-1.0-or-later",
  "GPL-2.0",
  "GPL-2.0-only",
  "GPL-2.0-or-later",
  "GPL-3.0",
  "GPL-3.0-only",
  "GPL-3.0-or-later",
  "LGPL-2.0",
  "LGPL-2.0-only",
  "LGPL-2.0-or-later",
  "LGPL-2.1-only",
  "LGPL-2.1-or-later",
  "LGPL-3.0",
  "LGPL-3.0-only",
  "LGPL-3.0-or-later",
  "MPL-1.1",
  "OFL-1.1",
  "Python-2.0",
  "Unlicense",
  "Zlib",
]);

export function isPackageRedistributableLicenseId(value: string) {
  return packageRedistributableLicenses.has(value.trim());
}

export function isLinkableOpenSourceLicenseId(value: string) {
  return linkableOpenSourceLicenses.has(value.trim());
}
