import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";

interface ContentEngagementOptions {
  contentType: "article" | "update";
  slug: string;
  category?: string;
  enabled?: boolean;
}

function getScrollDepth() {
  if (typeof window === "undefined") return 0;

  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const viewportHeight = window.innerHeight;
  const documentHeight = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight,
    document.body.offsetHeight,
    document.documentElement.offsetHeight
  );
  const scrollableHeight = Math.max(documentHeight - viewportHeight, 1);

  return Math.min(100, Math.round((scrollTop / scrollableHeight) * 100));
}

export function useContentEngagement({ contentType, slug, category, enabled = true }: ContentEngagementOptions) {
  const sentEventsRef = useRef(new Set<string>());

  useEffect(() => {
    sentEventsRef.current = new Set<string>();
  }, [contentType, slug]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!enabled) return;

    const baseParams = {
      content_type: contentType,
      slug,
      category
    };

    const sendOnce = (eventName: string, extraParams: Record<string, string | number> = {}) => {
      const key = `${eventName}:${slug}:${JSON.stringify(extraParams)}`;
      if (sentEventsRef.current.has(key)) return;

      sentEventsRef.current.add(key);
      trackEvent(eventName, { ...baseParams, ...extraParams });
    };

    const engagedTimeoutId = window.setTimeout(() => {
      sendOnce("content_engaged", { seconds_visible: 15 });
    }, 15000);

    const handleScroll = () => {
      const depth = getScrollDepth();

      if (depth >= 50) {
        sendOnce("content_scroll_depth", { depth: 50 });
      }

      if (depth >= 90) {
        sendOnce("content_scroll_depth", { depth: 90 });
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.clearTimeout(engagedTimeoutId);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [category, contentType, enabled, slug]);
}
