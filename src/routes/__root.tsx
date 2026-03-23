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
import { Toaster } from "@/components/ui/toaster";
import { Analytics } from "@vercel/analytics/react";
import appCss from "@/index.css?url";
import { getViewerState } from "@/server/auth-state";
import { SITE_NAME } from "@/lib/seo";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const GOOGLE_ANALYTICS_ID = "G-MWC6DGEDY4";

export const Route = createRootRoute({
  loader: async () => {
    const viewer = await getViewerState();
    return { viewer };
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
  const { viewer } = Route.useLoaderData();
  const [queryClient] = React.useState(
    () => new QueryClient()
  );

  return (
    <html lang="en">
      <head>
        <script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${GOOGLE_ANALYTICS_ID}', { send_page_view: false });
            `
          }}
        />
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <GoogleAnalyticsPageTracker />
          <ThemeProvider defaultTheme="system">
            <div className="relative flex min-h-screen flex-col bg-background">
              <SiteHeader initialViewer={viewer} />
              <main className="flex-1">
                <Outlet />
              </main>
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

function GoogleAnalyticsPageTracker() {
  const location = useLocation();

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.gtag !== "function") {
      return;
    }

    const pagePath = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    window.gtag("config", GOOGLE_ANALYTICS_ID, {
      page_path: pagePath,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [location.pathname, location.href]);

  return null;
}
