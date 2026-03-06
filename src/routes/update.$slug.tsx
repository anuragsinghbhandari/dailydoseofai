import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getUpdateBySlug, getUpdatesByDate } from "@/server/queries";
import { useSwipeable } from "react-swipeable";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ImpactScore } from "@/components/impact-score";
import { CategoryBadge } from "@/components/category-badge";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/update/$slug")({
  component: UpdateDetailPage
});

function UpdateDetailPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["update", slug],
    queryFn: () => (getUpdateBySlug as any)({ data: slug })
  });

  const dateObj = query.data ? new Date(query.data.created_at) : null;
  const dateStr = dateObj
    ? `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`
    : undefined;

  const dayUpdatesQuery = useQuery({
    queryKey: ["dayUpdates", dateStr],
    queryFn: () => (getUpdatesByDate as any)({ data: dateStr }),
    enabled: !!dateStr
  });

  let prevSlug = null;
  let nextSlug = null;

  if (dayUpdatesQuery.data) {
    const list = dayUpdatesQuery.data as any[];
    const currentIndex = list.findIndex((u) => u.slug === slug);
    if (currentIndex !== -1) {
      // In the displayed UI list, "Previous" means going up towards index 0
      prevSlug = list[currentIndex - 1]?.slug || null;
      // "Next" means continuing down the list to higher indexes
      nextSlug = list[currentIndex + 1]?.slug || null;
    }
  }

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (nextSlug) navigate({ to: `/update/${nextSlug}` });
    },
    onSwipedRight: () => {
      if (prevSlug) navigate({ to: `/update/${prevSlug}` });
    },
    trackMouse: false
  });

  if (query.isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="mx-auto h-40 max-w-2xl" />
      </div>
    );
  }

  if (!query.data) {
    return (
      <div className="container py-8">
        <p className="text-sm text-muted-foreground">
          Update not found or unpublished.
        </p>
      </div>
    );
  }

  const update = query.data;

  return (
    <div {...handlers} className="container max-w-4xl py-12 relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="mb-8">
        <Link
          to="/"
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to updates
        </Link>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-4 flex-1">
            <div className="flex items-center gap-2">
              <CategoryBadge category={update.category} />
              <span className="text-sm font-medium text-muted-foreground">
                {new Date(update.created_at).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric"
                })}
              </span>
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

      <div className="flex items-center justify-between w-full mb-8 gap-4">
        <div className="flex-1">
          {prevSlug ? (
            <Link
              to="/update/$slug"
              params={{ slug: prevSlug }}
              className="group relative flex flex-col items-start gap-1 p-4 rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md hover:border-primary/50 cursor-pointer transition-all duration-200 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center text-xs font-medium text-muted-foreground mb-1 group-hover:text-primary transition-colors">
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Previous Article
              </div>
              <span className="text-sm font-medium line-clamp-2">Swipe Right</span>
            </Link>
          ) : (
            <div className="p-4 rounded-xl border border-dashed bg-muted/30 text-muted-foreground flex items-center justify-center text-sm h-full">
              No previous article
            </div>
          )}
        </div>

        <div className="flex-1">
          {nextSlug ? (
            <Link
              to="/update/$slug"
              params={{ slug: nextSlug }}
              className="group relative flex flex-col items-end gap-1 p-4 rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md hover:border-primary/50 cursor-pointer transition-all duration-200 overflow-hidden text-right"
            >
              <div className="absolute inset-0 bg-gradient-to-l from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center text-xs font-medium text-muted-foreground mb-1 group-hover:text-primary transition-colors">
                Next Article
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </div>
              <span className="text-sm font-medium line-clamp-2">Swipe Left</span>
            </Link>
          ) : (
            <div className="p-4 rounded-xl border border-dashed bg-muted/30 text-muted-foreground flex items-center justify-center text-sm h-full">
              No next article
            </div>
          )}
        </div>
      </div>

      <Separator className="my-8" />

      <div className="grid gap-12 md:grid-cols-[1fr_250px]">
        <article className="space-y-8 prose prose-neutral dark:prose-invert max-w-none">
          <section>
            <h2 className="text-xl font-semibold tracking-tight border-b pb-2 mb-4">
              Summary
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {update.summary}
            </p>
          </section>

          {update.why_it_matters && update.why_it_matters !== 'Pending review' && (
            <section>
              <h2 className="text-xl font-semibold tracking-tight border-b pb-2 mb-4">
                Why it matters
              </h2>
              <p className="leading-relaxed">
                {update.why_it_matters}
              </p>
            </section>
          )}

          {update.content && !update.content.startsWith('Source: http') && (
            <section>
              <h2 className="text-xl font-semibold tracking-tight border-b pb-2 mb-4">
                Deep Dive
              </h2>
              <div className="whitespace-pre-wrap leading-relaxed">
                {update.content}
              </div>
            </section>
          )}
        </article>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">About this update</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <span className="font-semibold block mb-1">Category</span>
                <span className="text-muted-foreground">{update.category}</span>
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

        </aside>
      </div>
    </div>
  );
}

