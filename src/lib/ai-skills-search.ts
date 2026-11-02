export function buildAiSkillsSearchHref(
  pathname: string,
  currentSearch: string,
  query: string,
) {
  const params = new URLSearchParams(currentSearch);
  const normalizedQuery = query.trim();
  if (normalizedQuery) params.set("q", normalizedQuery);
  else params.delete("q");

  const search = params.toString();
  return search ? pathname + "?" + search : pathname;
}
