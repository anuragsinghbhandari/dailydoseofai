function getNavigationStorageKey(contextKey: string) {
  return `navigation-memory:${contextKey}`;
}

export function buildNavigationContextKey(params: {
  listContext?: string;
  returnDate?: string;
  filterStorageKey?: string;
}) {
  if (params.returnDate) return `date:${params.returnDate}`;
  if (params.listContext) return `list:${params.listContext}`;
  return `feed:${params.filterStorageKey ?? "home"}`;
}

export function saveNavigationSlugs(contextKey: string, slugs: string[]) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      getNavigationStorageKey(contextKey),
      JSON.stringify(slugs)
    );
  } catch {
    // Ignore storage failures.
  }
}

export function getNavigationSlugs(contextKey: string) {
  if (typeof window === "undefined") return [];

  try {
    const rawValue = window.sessionStorage.getItem(getNavigationStorageKey(contextKey));
    if (!rawValue) return [];

    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}
