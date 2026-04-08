import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  getTodayUpdates,
  getWeekUpdatesSummary,
  getMonthUpdatesSummary,
  getRecentPublishedUpdates,
  getPublishedCategories
} from "@/server/queries";
import { UpdateList } from "@/components/update-list";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { consumeScrollRestoreFlag, restoreScrollPosition } from "@/lib/scroll-memory";
import { createSeoHead } from "@/lib/seo";
import { ChevronLeft, ChevronRight, Rss } from "lucide-react";
import {
  formatLongUtcDate,
  formatShortUtcDate,
  formatUtcMonthYear,
  formatUtcWeekday,
  getCurrentUtcDate,
  getUtcDateKey,
  getUtcMonthStart,
  getUtcWeekStart
} from "@/lib/dates";

export const Route = createFileRoute("/")({
  head: () =>
    createSeoHead({
      title: "AI Dose | Daily AI News and Analysis",
      description:
        "Catch up on the most important AI news, product launches, and research in minutes with AI Dose.",
      pathname: "/"
    }),
  component: HomePage,
  loader: async () => {
    const [today, week, month, latest, categories] = await Promise.all([
      getTodayUpdates(),
      getWeekUpdatesSummary(),
      getMonthUpdatesSummary(),
      getRecentPublishedUpdates({ data: { limit: 15 } }),
      getPublishedCategories()
    ]);
    return { today, week, month, latest, categories };
  }
});

function groupUpdatesByDate(updates: { id: string | number; created_at: Date | string }[]) {
  const grouped: Record<string, number> = {};
  for (const update of updates) {
    const dateStr = getUtcDateKey(update.created_at);
    grouped[dateStr] = (grouped[dateStr] || 0) + 1;
  }
  return grouped;
}

function formatDateParam(date: Date) {
  return getUtcDateKey(date);
}

function getCurrentWeekDays(anchor: Date) {
  const days = [];
  const monday = getUtcWeekStart(anchor);
  const todayKey = getUtcDateKey(getCurrentUtcDate());

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    const dateStr = getUtcDateKey(d);
    const dayName = formatUtcWeekday(d);
    const dateNum = d.getUTCDate();
    const isToday = dateStr === todayKey;
    days.push({ dateStr, dayName, dateNum, isToday });
  }
  return days;
}

function getCurrentMonthDays(anchor: Date) {
  const days = [];
  const todayKey = getUtcDateKey(getCurrentUtcDate());
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  const startWeekday = firstDay.getUTCDay();
  const startDay = (startWeekday + 6) % 7;

  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }

  for (let i = 1; i <= lastDay.getUTCDate(); i++) {
    const d = new Date(Date.UTC(year, month, i));
    const dateStr = getUtcDateKey(d);
    const dayName = formatUtcWeekday(d);
    const dateNum = d.getUTCDate();
    const isToday = dateStr === todayKey;
    days.push({ dateStr, dayName, dateNum, isToday });
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }
  return days;
}

function HomePage() {
  const loaderData = Route.useLoaderData();
  const [isRestoringFeedState, setIsRestoringFeedState] = useState(false);
  const [weekAnchor, setWeekAnchor] = useState(() => getUtcWeekStart());
  const [monthAnchor, setMonthAnchor] = useState(() => getUtcMonthStart());

  const isCurrentWeek = weekAnchor.getTime() === getUtcWeekStart().getTime();
  const isCurrentMonth = monthAnchor.getTime() === getUtcMonthStart().getTime();

  useEffect(() => {
    const shouldRestore = consumeScrollRestoreFlag("/");
    if (!shouldRestore) return;

    setIsRestoringFeedState(true);
    restoreScrollPosition("/");

    const timeoutId = window.setTimeout(() => {
      setIsRestoringFeedState(false);
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  const todayQuery = useQuery({
    queryKey: ["updates", "today"],
    queryFn: () => getTodayUpdates(),
    initialData: loaderData.today,
    staleTime: 5 * 60 * 1000
  });

  const weekQuery = useQuery({
    queryKey: ["updates", "week", "summary", formatDateParam(weekAnchor)],
    queryFn: () => getWeekUpdatesSummary({ data: formatDateParam(weekAnchor) }),
    initialData: isCurrentWeek ? loaderData.week : undefined,
    staleTime: 5 * 60 * 1000
  });

  const monthQuery = useQuery({
    queryKey: ["updates", "month", "summary", formatDateParam(monthAnchor)],
    queryFn: () => getMonthUpdatesSummary({ data: formatDateParam(monthAnchor) }),
    initialData: isCurrentMonth ? loaderData.month : undefined,
    staleTime: 5 * 60 * 1000
  });

  const weekCounts = useMemo(() => groupUpdatesByDate(weekQuery.data ?? []), [weekQuery.data]);
  const monthCounts = useMemo(() => groupUpdatesByDate(monthQuery.data ?? []), [monthQuery.data]);

  return (
    <div className="flex flex-col min-h-screen">
      <section className="relative w-full overflow-hidden border-b border-border/50 bg-[linear-gradient(180deg,rgba(255,252,246,0.98),rgba(244,237,227,0.92))] py-24 md:py-28 lg:py-36 dark:bg-[linear-gradient(180deg,rgba(24,18,15,0.98),rgba(18,14,12,0.94))]">
        <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(124,89,64,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(124,89,64,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-[radial-gradient(circle_at_bottom,rgba(183,94,33,0.14),transparent_65%)] pointer-events-none" />

        <div className="container relative z-10">
          <div className="mx-auto flex max-w-4xl flex-col items-center space-y-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="inline-flex items-center rounded-full border border-border bg-background/80 px-4 py-1.5 text-sm font-medium text-foreground shadow-sm"
            >
              <span className="mr-2 flex h-2 w-2 rounded-full bg-primary"></span>
              Daily AI briefing
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
              className="space-y-5"
            >
              <h1 className="text-5xl font-heading font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl leading-[1.05] text-balance">
                The signal in AI, without the noise
              </h1>
              <p className="mx-auto max-w-2xl text-muted-foreground md:text-xl/relaxed lg:text-2xl/relaxed leading-relaxed">
                A sharper daily read on launches, research, tooling, and market moves that actually matter.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <div className="container py-16 md:py-24 space-y-20">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.9fr)]">
          <div className="rounded-3xl border border-border/50 bg-card/80 p-6 shadow-sm backdrop-blur md:p-8">
            <div className="mb-6 flex items-start justify-between gap-4 border-b border-border/40 pb-4">
              <div>
                <h2 className="text-3xl font-heading font-bold tracking-tight">Latest Articles</h2>
                <p className="mt-2 text-muted-foreground text-base md:text-lg">
                  Freshly published AI stories linked directly from the homepage for faster discovery.
                </p>
              </div>
              <a href="/rss.xml" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                <Rss className="h-4 w-4" />
                RSS Feed
              </a>
            </div>

            <ol className="space-y-3">
              {loaderData.latest.map((update, index) => (
                <li key={update.id} className="grid gap-2 border-b border-border/30 pb-3 last:border-b-0 last:pb-0 md:grid-cols-[auto_1fr] md:gap-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="space-y-1">
                    <Link
                      to="/update/$slug"
                      params={{ slug: update.slug }}
                      className="text-base font-semibold leading-snug text-foreground transition-colors hover:text-primary"
                    >
                      {update.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      Published {formatLongUtcDate(update.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <aside className="rounded-3xl border border-border/50 bg-card/80 p-6 shadow-sm backdrop-blur md:p-8">
            <div className="mb-6 border-b border-border/40 pb-4">
              <h2 className="text-2xl font-heading font-bold tracking-tight">Browse by Category</h2>
              <p className="mt-2 text-muted-foreground">
                Category archives keep older stories reachable in two clicks from the homepage.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {loaderData.categories.slice(0, 12).map((category) => (
                <Link
                  key={category.slug}
                  to="/category/$categorySlug"
                  params={{ categorySlug: category.slug }}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                >
                  <span>{category.name}</span>
                  <span className="text-muted-foreground">{category.count}</span>
                </Link>
              ))}
            </div>
          </aside>
        </section>

        <section>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-border/40 pb-4">
            <div className="space-y-2">
              <h2 className="text-3xl font-heading font-bold tracking-tight">Today's Updates</h2>
              <p className="text-muted-foreground text-lg">The most important AI news from today.</p>
            </div>
          </div>
          <UpdateList
            updates={todayQuery.data ?? []}
            isLoading={todayQuery.isLoading}
            filterStorageKey="home"
            skipInitialAnimation={isRestoringFeedState}
          />
        </section>

        <section>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-border/40 pb-4">
            <div className="space-y-2">
              <h2 className="text-3xl font-heading font-bold tracking-tight">
                {isCurrentWeek ? "This Week" : "Week View"}
              </h2>
              <p className="text-muted-foreground text-lg">
                {formatShortUtcDate(weekAnchor)}
                {" - "}
                {formatShortUtcDate(
                  new Date(Date.UTC(
                    weekAnchor.getUTCFullYear(),
                    weekAnchor.getUTCMonth(),
                    weekAnchor.getUTCDate() + 6
                  ))
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeekAnchor((prev) => {
                  const next = new Date(prev);
                  next.setUTCDate(prev.getUTCDate() - 7);
                  return getUtcWeekStart(next);
                })}
              >
                <ChevronLeft />
                Previous Week
              </Button>
              {isCurrentWeek ? (
                <Button variant="outline" size="sm" disabled>
                  Next Week
                  <ChevronRight />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWeekAnchor((prev) => {
                    const next = new Date(prev);
                    next.setUTCDate(prev.getUTCDate() + 7);
                    return getUtcWeekStart(next);
                  })}
                >
                  Next Week
                  <ChevronRight />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
              {getCurrentWeekDays(weekAnchor).map((day, idx) => {
                const count = weekCounts[day.dateStr] || 0;
                return (
                  <motion.div
                    key={day.dateStr}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 + 0.2 }}
                  >
                    <Link
                      to="/date/$date"
                      params={{ date: day.dateStr }}
                      className={`flex min-h-[88px] flex-col items-center justify-center p-3 rounded-lg border transition-all hover:shadow-md ${count > 0 ? "bg-card hover:border-primary/50 relative overflow-hidden cursor-pointer" : "bg-muted/20 opacity-60 hover:opacity-100 cursor-pointer"} ${day.isToday ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                    >
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{day.dayName}</span>
                      <span className="text-2xl font-bold mt-1">{day.dateNum}</span>
                      <span className="text-xs mt-1 text-muted-foreground">{count} updates</span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-border/40 pb-4">
            <div className="space-y-2">
              <h2 className="text-3xl font-heading font-bold tracking-tight">
                {isCurrentMonth ? "This Month" : "Month View"}
              </h2>
              <p className="text-muted-foreground text-lg">
                {formatUtcMonthYear(monthAnchor)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMonthAnchor((prev) => new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() - 1, 1)))}
              >
                <ChevronLeft />
                Previous Month
              </Button>
              {isCurrentMonth ? (
                <Button variant="outline" size="sm" disabled>
                  Next Month
                  <ChevronRight />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMonthAnchor((prev) => new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() + 1, 1)))}
                >
                  Next Month
                  <ChevronRight />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-7 gap-3">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
              {getCurrentMonthDays(monthAnchor).map((day, idx) => {
                if (!day) {
                  return <div key={`empty-${idx}`} className="min-h-[88px] rounded-lg border border-dashed border-border/40 bg-muted/10" />;
                }

                const count = monthCounts[day.dateStr] || 0;
                return (
                  <Link
                    key={day.dateStr}
                    to="/date/$date"
                    params={{ date: day.dateStr }}
                    className={`flex min-h-[88px] flex-col items-center justify-center p-3 rounded-lg border transition-all hover:shadow-md ${count > 0 ? "bg-card hover:border-primary/50 relative overflow-hidden cursor-pointer" : "bg-muted/20 opacity-60 hover:opacity-100 cursor-pointer"} ${day.isToday ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                  >
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{day.dayName}</span>
                    <span className="text-2xl font-bold mt-1">{day.dateNum}</span>
                    <span className="text-xs mt-1 text-muted-foreground">{count} updates</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
