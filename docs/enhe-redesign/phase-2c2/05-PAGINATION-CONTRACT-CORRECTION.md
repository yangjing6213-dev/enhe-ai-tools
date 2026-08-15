# Pagination contract correction

Commit 49c0bcfd7b88aa2f5ed0e786731d6d78f9a9406b replaces the production interpretation of the candidate's 9-visible-plus-3-hidden interaction with real server pagination.

- SOFTWARE_CATALOG_PAGE_SIZE=12 is fixed.
- A 25-row public fixture yields 12 items on page 1, 12 on page 2, and 1 on page 3.
- Production pages return page, pageSize, total, totalPages, hasPrevious, hasNext, previousHref, and nextHref.
- Page 1 omits page; page=1 normalizes to the base path; page 2 and later are independently server-rendered.
- Invalid, non-positive, non-integer, and out-of-range pages return a hard 404.
- Load-more text is rendered only when hasNext is true and is an ordinary crawlable link. Previous and next links are ordinary links with rel=prev and rel=next.
- The preview retains its approved 9/3 fixture interaction. Production imports neither that fixture nor its hidden-item behavior.

Verified canonicals:

| Locale | Page 1 | Page 2 |
| --- | --- | --- |
| zh | https://www.enhe-tech.com.cn/software | https://www.enhe-tech.com.cn/software?page=2 |
| en | https://www.enhe-tech.com.cn/en/software | https://www.enhe-tech.com.cn/en/software?page=2 |
