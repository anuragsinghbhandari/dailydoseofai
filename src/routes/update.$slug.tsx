import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  getAdjacentUpdates,
  getRecentPublishedUpdates,
  getRelatedUpdates,
  getUpdateBySlug
} from "@/server/queries";
import { useSwipeable } from "react-swipeable";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ImpactScore } from "@/components/impact-score";
import { CategoryBadge } from "@/components/category-badge";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { EngagementBar } from "@/components/engagement-bar";
import { CommentsSection } from "@/components/comments-section";
import { recordView } from "@/server/engagement";
import { useSession } from "@/lib/auth";
import { markUpdateAsSeen } from "@/lib/local-seen";
import { buildNavigationContextKey, getNavigationSlugs } from "@/lib/navigation-memory";
import { absoluteUrl, createSeoHead, truncateDescription } from "@/lib/seo";
import { toCategorySlug } from "@/lib/content-taxonomy";
import { formatLongUtcDate, formatShortUtcDate, getUtcDateKey } from "@/lib/dates";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";

function markUpdateSeenInCachedLists(queryClient: ReturnType<typeof useQueryClient>, updateId: string) {
  queryClient.setQueriesData({ queryKey: ["updates"] }, (existing) => {
    if (!Array.isArray(existing)) return existing;

    return existing.map((item: any) => {
      if (!item || typeof item !== "object" || item.id !== updateId) return item;
      return { ...item, isSeen: true };
    });
  });
}

function buildBreadcrumbSchema(update: any) {
  const categorySlug = toCategorySlug(update.category);

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: absoluteUrl("/")
      },
      {
        "@type": "ListItem",
        position: 2,
        name: update.category,
        item: absoluteUrl(`/category/${categorySlug}`)
      },
      {
        "@type": "ListItem",
        position: 3,
        name: update.title,
        item: absoluteUrl(`/update/${update.slug}`)
      }
    ]
  };
}

export const Route = createFileRoute("/update/$slug")({
  component: UpdateDetailPage,
  remountDeps: ({ params }) => params.slug,
  head: ({ params, loaderData }) => {
    const update = loaderData?.update;
    const title = update?.title ? `${update.title} | AI Dose` : "AI Update | AI Dose";
    const description = truncateDescription(
      update?.summary || update?.why_it_matters || "Read the latest AI update on AI Dose."
    );

    return {
      ...createSeoHead({
        title,
        description,
        pathname: `/update/${params.slug}`,
        type: "article",
        publishedTime: update?.created_at ? new Date(update.created_at).toISOString() : undefined,
        modifiedTime: update?.created_at ? new Date(update.created_at).toISOString() : undefined
      }),
      scripts: update
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "NewsArticle",
                headline: update.title,
                description,
                datePublished: new Date(update.created_at).toISOString(),
                dateModified: new Date(update.created_at).toISOString(),
                mainEntityOfPage: absoluteUrl(`/update/${params.slug}`),
                articleSection: update.category,
                url: absoluteUrl(`/update/${params.slug}`),
                publisher: {
                  "@type": "Organization",
                  name: "AI Dose",
                  url: absoluteUrl("/")
                },
                isAccessibleForFree: true,
                ...(update.source_url ? { sameAs: [update.source_url] } : {})
              })
            },
            {
              type: "application/ld+json",
              children: JSON.stringify(buildBreadcrumbSchema(update))
            }
          ]
        : []
    };
  },
  validateSearch: z.object({
    list: z.string().optional(),
    date: z.string().optional(),
  }),
  loader: async ({ params, deps }) => {
    const searchDeps = deps as any;
    const update = await (getUpdateBySlug as any)({ data: params.slug });

    if (!update) {
      return {
        update: null,
        adjacent: { prevSlug: null, nextSlug: null },
        related: [],
        recent: []
      };
    }

    const [adjacent, related, recent] = await Promise.all([
      (getAdjacentUpdates as any)({ data: { slug: params.slug, list: searchDeps?.list } }),
      (getRelatedUpdates as any)({ data: { slug: params.slug, category: update.category, limit: 4 } }),
      (getRecentPublishedUpdates as any)({ data: { limit: 8 } })
    ]);

    return { update, adjacent, related, recent };
  },
  loaderDeps: ({ search: { list, date } }) => ({ list, date }),
  pendingComponent: () => (
    <div className="container max-w-4xl py-12 space-y-8">
      <div className="h-4 w-32 bg-muted rounded animate-pulse mb-8" />
      <div className="h-12 w-3/4 bg-muted rounded animate-pulse mb-8" />
      <div className="flex gap-4 mb-8">
        <div className="h-24 flex-1 bg-muted rounded-xl animate-pulse" />
        <div className="h-24 flex-1 bg-muted rounded-xl animate-pulse" />
      </div>
      <div className="grid gap-12 md:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <div className="h-4 w-full bg-muted rounded animate-pulse" />
          <div className="h-4 w-full bg-muted rounded animate-pulse" />
          <div className="h-4 w-5/6 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-64 w-full bg-muted rounded-xl animate-pulse" />
      </div>
    </div>
  )
});

function UpdateDetailPage() {
  const { slug } = Route.useParams();
  const { list, date } = Route.useSearch();
  const loaderData = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
  const [direction, setDirection] = useState(1);
  const { data: session } = useSession();

  const queryClient = useQueryClient();

  const todayUpdates = queryClient.getQueryData(["updates", "today"]) as any[] | undefined;
  const listUpdates = list ? queryClient.getQueryData(["updates", list]) as any[] | undefined : undefined;
  let initialUpdateData =
    loaderData.update || listUpdates?.find((update) => update.slug === slug) || todayUpdates?.find((update) => update.slug === slug);

  if (!initialUpdateData) {
    const dateQueries = queryClient.getQueriesData({ queryKey: ["updates", "date"] });
    for (const [, data] of dateQueries) {
      if (Array.isArray(data)) {
        const found = data.find((update) => update.slug === slug);
        if (found) {
          initialUpdateData = found;
          break;
        }
      }
    }
  }

  const query = useQuery({
    queryKey: ["update", slug],
    queryFn: () => (getUpdateBySlug as any)({ data: slug }),
    initialData: initialUpdateData
  });

  const prevSlug = loaderData.adjacent?.prevSlug || null;
  const nextSlug = loaderData.adjacent?.nextSlug || null;
  const navigationContextKey = buildNavigationContextKey({
    listContext: list,
    returnDate: date,
    filterStorageKey: !list && !date ? "home" : undefined,
  });
  const storedNavigationSlugs = getNavigationSlugs(navigationContextKey);
  const storedNavigationIndex = storedNavigationSlugs.indexOf(slug);
  const computedPrevSlug = storedNavigationIndex > 0 ? storedNavigationSlugs[storedNavigationIndex - 1] : null;
  const computedNextSlug =
    storedNavigationIndex >= 0 && storedNavigationIndex < storedNavigationSlugs.length - 1
      ? storedNavigationSlugs[storedNavigationIndex + 1]
      : null;
  const activePrevSlug = computedPrevSlug ?? prevSlug;
  const activeNextSlug = computedNextSlug ?? nextSlug;

  useEffect(() => {
    const search = { ...(list ? { list } : {}), ...(date ? { date } : {}) };
    if (activeNextSlug) router.preloadRoute({ to: `/update/${activeNextSlug}`, search }).catch(() => {});
    if (activePrevSlug) router.preloadRoute({ to: `/update/${activePrevSlug}`, search }).catch(() => {});
  }, [activeNextSlug, activePrevSlug, router, list, date]);

  const goToNext = () => {
    if (!activeNextSlug) return;
    setDirection(1);
    navigate({ to: `/update/${activeNextSlug}`, search: { ...(list ? { list } : {}), ...(date ? { date } : {}) } });
  };

  const goToPrev = () => {
    if (!activePrevSlug) return;
    setDirection(-1);
    navigate({ to: `/update/${activePrevSlug}`, search: { ...(list ? { list } : {}), ...(date ? { date } : {}) } });
  };

  const handlers = useSwipeable({
    onSwipedLeft: goToNext,
    onSwipedRight: goToPrev,
    delta: 80,
    trackMouse: false
  });

  const update = query.data;

  useEffect(() => {
    if (update?.id) {
      if (session) {
        markUpdateSeenInCachedLists(queryClient, update.id);
        (recordView as any)({ data: { updateId: update.id } })
          .then((result: any) => {
            markUpdateSeenInCachedLists(queryClient, update.id);
            if (result?.viewed) {
              queryClient.setQueryData(["user", "streak"], {
                streak: result.streak ?? 0,
                lastActiveDate: result.lastActiveDate ?? null,
              });
            }
          })
          .catch(console.error);
      } else {
        markUpdateAsSeen(update.id);
      }
    }
  }, [queryClient, session, update?.id]);

  if (query.isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="mx-auto h-40 max-w-2xl" />
      </div>
    );
  }

  if (!update) {
    return (
      <div className="container py-8">
        <p className="text-sm text-muted-foreground">Update not found or unpublished.</p>
      </div>
    );
  }

  const relatedUpdates = (loaderData.related ?? []).filter((item: any) => item.slug !== slug).slice(0, 4);
  const recentUpdates = (loaderData.recent ?? []).filter((item: any) => item.slug !== slug).slice(0, 6);
  const contextualLinks = [...relatedUpdates, ...recentUpdates].filter(
    (item: any, index: number, arr: any[]) => arr.findIndex((candidate) => candidate.slug === item.slug) === index
  ).slice(0, 4);
  const categorySlug = toCategorySlug(update.category);
  const articleDate = formatLongUtcDate(update.created_at);
  const articleDateParam = getUtcDateKey(update.created_at);

  const slideVariants: any = {
    initial: (d: number) => ({ x: d > 0 ? 50 : -50, opacity: 0 }),
    animate: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
    exit: (d: number) => ({ x: d > 0 ? -50 : 50, opacity: 0, transition: { duration: 0.15 } })
  };

  return (
    <div {...handlers} className="container max-w-6xl px-4 py-6 md:py-12 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="fixed right-3 top-1/2 z-20 -translate-y-1/2 sm:hidden">
        <EngagementBar updateId={update.id} variant="shorts" />
      </div>

      <div className="mb-8 space-y-6">
        <Link
          to={date ? "/date/$date" : list === "bookmarks" ? "/bookmarks" : "/"}
          params={date ? { date } : undefined}
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {date ? "updates" : list === "bookmarks" ? "Bookmarks" : "updates"}
        </Link>

        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/category/$categorySlug" params={{ categorySlug }}>
                  {update.category}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{update.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div
          key={slug}
          custom={direction}
          variants={slideVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="space-y-4 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <Link to="/category/$categorySlug" params={{ categorySlug }} className="hover:opacity-90">
                    <CategoryBadge category={update.category} />
                  </Link>
                  <Link
                    to="/date/$date"
                    params={{ date: articleDateParam }}
                    className="text-sm font-medium text-muted-foreground hover:text-primary"
                  >
                    {articleDate}
                  </Link>
                </div>
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-extrabold tracking-tight leading-tight">
                  {update.title}
                </h1>
              </div>
              <div className="flex-shrink-0 flex items-center gap-4">
                <ImpactScore score={update.impact_score} />
              </div>
            </div>
          </div>

          <div className="mb-6 flex items-center justify-between rounded-2xl border border-border/50 bg-card/70 px-4 py-3 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur sm:hidden">
            <button
              type="button"
              onClick={goToPrev}
              disabled={!activePrevSlug}
              className="inline-flex items-center gap-1 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="text-center text-[11px] uppercase tracking-[0.24em] text-foreground/60">
              Swipe left/right
            </span>
            <button
              type="button"
              onClick={goToNext}
              disabled={!activeNextSlug}
              className="inline-flex items-center gap-1 disabled:opacity-30"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-8 hidden w-full items-center justify-between gap-4 sm:flex">
            <div className="flex-1">
              {activePrevSlug ? (
                <Link
                  to="/update/$slug"
                  params={{ slug: activePrevSlug }}
                  search={{ ...(list ? { list } : {}), ...(date ? { date } : {}) }}
                  onClick={() => setDirection(-1)}
                  className="group relative flex flex-col items-start gap-1 p-4 rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md hover:border-primary/50 cursor-pointer transition-all duration-200 overflow-hidden"
                >
                  <div className="flex items-center text-xs font-medium text-muted-foreground mb-1 group-hover:text-primary transition-colors">
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                    Previous Article
                  </div>
                  <span className="text-sm font-medium line-clamp-2">Move to the previous article in the active list</span>
                </Link>
              ) : (
                <div className="p-4 rounded-xl border border-dashed bg-muted/30 text-muted-foreground flex items-center justify-center text-sm h-full">
                  No previous article
                </div>
              )}
            </div>

            <div className="flex-1">
              {activeNextSlug ? (
                <Link
                  to="/update/$slug"
                  params={{ slug: activeNextSlug }}
                  search={{ ...(list ? { list } : {}), ...(date ? { date } : {}) }}
                  onClick={() => setDirection(1)}
                  className="group relative flex flex-col items-end gap-1 p-4 rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md hover:border-primary/50 cursor-pointer transition-all duration-200 overflow-hidden text-right"
                >
                  <div className="flex items-center text-xs font-medium text-muted-foreground mb-1 group-hover:text-primary transition-colors">
                    Next Article
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </div>
                  <span className="text-sm font-medium line-clamp-2">Move to the next article in the active list</span>
                </Link>
              ) : (
                <div className="p-4 rounded-xl border border-dashed bg-muted/30 text-muted-foreground flex items-center justify-center text-sm h-full">
                  No next article
                </div>
              )}
            </div>
          </div>

          <Separator className="my-8" />

          <div className="grid gap-8 md:gap-12 md:grid-cols-[minmax(0,1fr)_300px]">
            <article className="space-y-6 md:space-y-8 prose prose-neutral dark:prose-invert max-w-none">
              <section className="rounded-3xl border border-border/50 bg-card/75 p-5 shadow-sm backdrop-blur md:border-0 md:bg-transparent md:p-0 md:shadow-none">
                <h2 className="text-xl font-semibold tracking-tight border-b pb-2 mb-4">
                  Summary
                </h2>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  {update.summary}
                </p>
              </section>

              {update.content && !update.content.startsWith("Source: http") && (
                <section className="rounded-3xl border border-border/50 bg-card/75 p-5 shadow-sm backdrop-blur md:border-0 md:bg-transparent md:p-0 md:shadow-none">
                  <h2 className="text-xl font-semibold tracking-tight border-b pb-2 mb-4">
                    Deep Dive
                  </h2>
                  <div className="whitespace-pre-wrap leading-relaxed">{update.content}</div>
                </section>
              )}

              {contextualLinks.length > 0 && (
                <section className="rounded-3xl border border-border/50 bg-card/75 p-5 shadow-sm backdrop-blur md:border-0 md:bg-transparent md:p-0 md:shadow-none">
                  <h2 className="text-xl font-semibold tracking-tight border-b pb-2 mb-4">
                    Continue Reading
                  </h2>
                  <p className="leading-relaxed text-muted-foreground">
                    Explore related coverage about {update.category.toLowerCase()} and adjacent AI developments: {contextualLinks.map((item: any, index: number) => (
                      <span key={item.slug}>
                        <Link to="/update/$slug" params={{ slug: item.slug }} className="font-medium text-primary hover:underline">
                          {item.title}
                        </Link>
                        {index < contextualLinks.length - 1 ? ", " : "."}
                      </span>
                    ))}
                  </p>
                </section>
              )}

              {relatedUpdates.length > 0 && (
                <section className="rounded-3xl border border-border/50 bg-card/75 p-5 shadow-sm backdrop-blur md:border-0 md:bg-transparent md:p-0 md:shadow-none">
                  <h2 className="text-xl font-semibold tracking-tight border-b pb-2 mb-4">
                    Related Articles
                  </h2>
                  <ul className="not-prose space-y-3">
                    {relatedUpdates.map((item: any) => (
                      <li key={item.slug} className="border-b border-border/30 pb-3 last:border-b-0 last:pb-0">
                        <Link to="/update/$slug" params={{ slug: item.slug }} className="font-medium text-foreground hover:text-primary hover:underline">
                          {item.title}
                        </Link>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatLongUtcDate(item.created_at)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <div className="hidden sm:block">
                <EngagementBar updateId={update.id} />
              </div>

              <section className="rounded-3xl border border-border/50 bg-card/75 p-5 shadow-sm backdrop-blur md:border-0 md:bg-transparent md:p-0 md:shadow-none">
                <CommentsSection updateId={update.id} />
              </section>
            </article>

            <aside className="space-y-6">
              <Card className="rounded-3xl border-border/50 bg-card/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-sm">About this update</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <span className="font-semibold block mb-1">Category</span>
                    <Link to="/category/$categorySlug" params={{ categorySlug }} className="text-primary hover:underline">
                      {update.category}
                    </Link>
                  </div>
                  <div>
                    <span className="font-semibold block mb-1">Published</span>
                    <Link to="/date/$date" params={{ date: articleDateParam }} className="text-primary hover:underline">
                      {articleDate}
                    </Link>
                  </div>
                  <div>
                    <span className="font-semibold block mb-1">Impact</span>
                    <span className="text-muted-foreground">{update.impact_score}/10</span>
                  </div>
                  {update.source_url && (
                    <div>
                      <span className="font-semibold block mb-1">Source</span>
                      <a
                        href={update.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        Read original article
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>

              {recentUpdates.length > 0 && (
                <Card className="rounded-3xl border-border/50 bg-card/80 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-sm">Recent Articles</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-4 text-sm">
                      {recentUpdates.map((item: any) => (
                        <li key={item.slug} className="border-b border-border/30 pb-3 last:border-b-0 last:pb-0">
                          <Link to="/update/$slug" params={{ slug: item.slug }} className="font-medium text-foreground hover:text-primary hover:underline">
                            {item.title}
                          </Link>
                          <p className="mt-1 text-muted-foreground">
                            {formatShortUtcDate(item.created_at)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </aside>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
