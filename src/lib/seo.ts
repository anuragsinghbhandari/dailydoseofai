const FALLBACK_SITE_URL = "https://www.dailydoseofai.tech";

export const SITE_NAME = "AI Dose";
export const DEFAULT_TITLE = "AI Dose | Daily AI News and Analysis";
export const DEFAULT_DESCRIPTION =
  "AI Dose tracks the most important AI news, research, tools, and product launches in a fast daily briefing.";

type SeoInput = {
  title: string;
  description: string;
  pathname: string;
  type?: "website" | "article";
  robots?: string;
  publishedTime?: string;
  modifiedTime?: string;
};

function normalizeSiteUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function getSiteUrl() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return normalizeSiteUrl(window.location.origin);
  }

  if (typeof process !== "undefined" && process.env.SERVER_URL) {
    return normalizeSiteUrl(process.env.SERVER_URL);
  }

  if (typeof process !== "undefined" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return FALLBACK_SITE_URL;
}

export function absoluteUrl(pathname: string) {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${getSiteUrl()}${path}`;
}

export function createSeoHead({
  title,
  description,
  pathname,
  type = "website",
  robots = "index, follow",
  publishedTime,
  modifiedTime
}: SeoInput) {
  const canonical = absoluteUrl(pathname);
  const meta = [
    { title },
    { name: "description", content: description },
    { name: "robots", content: robots },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: type },
    { property: "og:url", content: canonical },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description }
  ];

  if (publishedTime) {
    meta.push({ property: "article:published_time", content: publishedTime });
  }

  if (modifiedTime) {
    meta.push({ property: "article:modified_time", content: modifiedTime });
  }

  return {
    meta,
    links: [
      {
        rel: "canonical",
        href: canonical
      }
    ]
  };
}

export function createNoIndexHead(title: string, description: string) {
  return createSeoHead({
    title,
    description,
    pathname: "/",
    robots: "noindex, nofollow"
  });
}

export function truncateDescription(value: string, maxLength = 160) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}
