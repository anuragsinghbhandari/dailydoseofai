import * as React from "react";
import {
  Outlet,
  HeadContent,
  Scripts,
  createRootRoute,
  Link,
  useLocation
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { StreakCelebrationOverlay } from "@/components/streak-celebration-overlay";
import { Toaster } from "@/components/ui/toaster";
import { Analytics } from "@vercel/analytics/react";
import appCss from "@/index.css?url";
import { getViewerState } from "@/server/auth-state";
import { getRecentPublishedUpdates } from "@/server/queries";
import { SITE_NAME } from "@/lib/seo";
import { formatShortUtcDate } from "@/lib/dates";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const GOOGLE_ANALYTICS_ID = "G-MWC6DGEDY4";

export const Route = createRootRoute({
  loader: async () => {
    const [viewer, recentPosts] = await Promise.all([
      getViewerState(),
      getRecentPublishedUpdates({ data: { limit: 5 } })
    ]);
    return { viewer, recentPosts };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1"
      },
      { title: SITE_NAME }
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss
      },
      {
        rel: "icon",
        href: "/favicon.ico",
        sizes: "any"
      },
      {
        rel: "shortcut icon",
        href: "/favicon.ico"
      },
      {
        rel: "alternate",
        type: "application/rss+xml",
        title: "AI Dose RSS Feed",
        href: "/rss.xml"
      }
    ]
  }),
  component: RootLayout,
  notFoundComponent: () => {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <h1 className="text-4xl font-bold mb-4">404 - Not Found</h1>
        <p className="text-muted-foreground mb-8">The page you are looking for does not exist.</p>
        <Link to="/" className="text-primary hover:underline font-medium">
          Go back home
        </Link>
      </div>
    );
  }
});

function RootLayout() {
  const { viewer, recentPosts } = Route.useLoaderData();
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <DeferredGoogleAnalytics />
          <ThemeProvider defaultTheme="system">
            <StreakCelebrationOverlay initialViewer={viewer} />
            <div className="relative flex min-h-screen flex-col bg-background">
              <SiteHeader initialViewer={viewer} />
              <main className="flex-1">
                <Outlet />
              </main>
              <footer className="border-t border-border/50 bg-card/40">
                <div className="container grid gap-8 py-10 md:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                  <div className="space-y-3">
                    <h2 className="text-xl font-heading font-semibold tracking-tight">AI Dose</h2>
                    <p className="max-w-2xl text-sm text-muted-foreground">
                      Daily AI reporting with direct links to the newest stories, category archives, and feed endpoints so fresh articles are easy for readers and crawlers to discover.
                    </p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <Link to="/" className="text-foreground hover:text-primary hover:underline">
                        Home
                      </Link>
                      <Link to="/today" className="text-foreground hover:text-primary hover:underline">
                        Today
                      </Link>
                      <a href="/rss.xml" className="text-foreground hover:text-primary hover:underline">
                        RSS Feed
                      </a>
                      <a href="/sitemap.xml" className="text-foreground hover:text-primary hover:underline">
                        Sitemap
                      </a>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      Recent Posts
                    </h2>
                    <ul className="space-y-3 text-sm">
                      {recentPosts.map((post) => (
                        <li key={post.id} className="border-b border-border/30 pb-3 last:border-b-0 last:pb-0">
                          <Link
                            to="/update/$slug"
                            params={{ slug: post.slug }}
                            className="font-medium text-foreground hover:text-primary hover:underline"
                          >
                            {post.title}
                          </Link>
                          <p className="mt-1 text-muted-foreground">
                            {formatShortUtcDate(post.created_at)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </footer>
            </div>
            <Toaster />
            <Analytics />
            <Scripts />
          </ThemeProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}

function DeferredGoogleAnalytics() {
  const location = useLocation();
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (window.gtag) {
      setIsReady(true);
      return;
    }

    window.dataLayer = window.dataLayer || [];
    window.gtag = (...args: unknown[]) => {
      window.dataLayer.push(args);
    };
    window.gtag("js", new Date());
    window.gtag("config", GOOGLE_ANALYTICS_ID, { send_page_view: false });

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[data-gtag-id="${GOOGLE_ANALYTICS_ID}"]`
    );

    if (existingScript) {
      setIsReady(true);
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + GOOGLE_ANALYTICS_ID;
    script.dataset.gtagId = GOOGLE_ANALYTICS_ID;
    script.onload = () => {
      setIsReady(true);
    };
    document.head.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.gtag !== "function" || !isReady) {
      return;
    }

    const pagePath = window.location.pathname + window.location.search + window.location.hash;

    window.gtag("event", "page_view", {
      page_path: pagePath,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [isReady, location.href]);

  return null;
}
