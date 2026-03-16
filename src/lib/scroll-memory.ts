function getScrollStorageKey(pathname: string, search: string) {
  return `scroll-memory:${pathname}${search}`;
}

function getReturnFlagKey(pathname: string, search: string) {
  return `scroll-memory:returning:${pathname}${search}`;
}

export function saveCurrentScrollPosition() {
  if (typeof window === "undefined") return;

  try {
    const pathname = window.location.pathname;
    const search = window.location.search;

    window.sessionStorage.setItem(
      getScrollStorageKey(pathname, search),
      String(window.scrollY)
    );
    window.sessionStorage.setItem(getReturnFlagKey(pathname, search), "true");
  } catch {
    // Ignore storage failures.
  }
}

export function restoreScrollPosition(pathname: string, search = "") {
  if (typeof window === "undefined") return;

  const storageKey = getScrollStorageKey(pathname, search);

  try {
    const storedValue = window.sessionStorage.getItem(storageKey);
    if (storedValue === null) return;

    window.sessionStorage.removeItem(storageKey);
    const scrollY = Number(storedValue);

    if (Number.isFinite(scrollY)) {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, behavior: "auto" });
      });
    }
  } catch {
    // Ignore storage failures.
  }
}

export function consumeScrollRestoreFlag(pathname: string, search = "") {
  if (typeof window === "undefined") return false;

  const storageKey = getReturnFlagKey(pathname, search);

  try {
    const shouldRestore = window.sessionStorage.getItem(storageKey) === "true";
    window.sessionStorage.removeItem(storageKey);
    return shouldRestore;
  } catch {
    return false;
  }
}
