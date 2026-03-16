const LOCAL_SEEN_UPDATES_KEY = "seen-updates";

export function getSeenUpdateIds(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const rawValue = window.localStorage.getItem(LOCAL_SEEN_UPDATES_KEY);
    if (!rawValue) return [];

    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

export function markUpdateAsSeen(updateId: string) {
  if (typeof window === "undefined") return;

  try {
    const seenUpdateIds = getSeenUpdateIds();
    if (seenUpdateIds.includes(updateId)) return;

    window.localStorage.setItem(
      LOCAL_SEEN_UPDATES_KEY,
      JSON.stringify([updateId, ...seenUpdateIds])
    );
  } catch {
    // Ignore storage failures and fall back to default unseen behavior.
  }
}
