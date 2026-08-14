# Phase 2C.1 auth and admin boundary

Status: PASS

The public Header reads the existing signed `headerUserCookie` through `getHeaderUserSnapshot()`. It does not read localStorage, query parameters, or client-provided role flags. The admin entry is rendered only when the server snapshot has `role === "admin"`.

Guest browser acceptance found exactly one login entry and no admin link on every checked public Chinese and English route. Existing private and admin source tests passed, including auth security, admin rules, user-center, route-source, and shared English UI boundaries.

No auth, user-center, order, payment, admin, or API implementation was refactored. The English public layout conditionally disables legacy public effects while explicitly excluding `/en/login`, `/en/register`, and `/en/user` private paths.
