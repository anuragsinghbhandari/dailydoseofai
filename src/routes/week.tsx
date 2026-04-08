import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getWeekUpdates } from "@/server/queries";
import { UpdateList } from "@/components/update-list";
import { createSeoHead } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { z } from "zod";
import { formatShortUtcDate, getUtcDateKey, getUtcWeekStart, parseUtcDateKey } from "@/lib/dates";

export const Route = createFileRoute("/week")({
  validateSearch: z.object({
    date: z.string().optional()
  }),
  head: () =>
    createSeoHead({
      title: "This Week in AI | AI Dose",
      description: "Catch up on the biggest AI stories, releases, and developments from the current week.",
      pathname: "/week"
    }),
  component: WeekPage,
  loaderDeps: ({ search: { date } }) => ({ date }),
  loader: async ({ deps: { date } }) => {
    const week = await getWeekUpdates({ data: date });
    return { week };
  }
});

function formatDateParam(date: Date) {
  return getUtcDateKey(date);
}

function WeekPage() {
  const loaderData = Route.useLoaderData();
  const { date } = Route.useSearch();
  const weekStart = getUtcWeekStart(date ? parseUtcDateKey(date) ?? undefined : undefined);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

  const previousWeek = new Date(weekStart);
  previousWeek.setUTCDate(weekStart.getUTCDate() - 7);

  const nextWeek = new Date(weekStart);
  nextWeek.setUTCDate(weekStart.getUTCDate() + 7);

  const currentWeekStart = getUtcWeekStart();
  const isCurrentWeek = weekStart.getTime() === currentWeekStart.getTime();

  const query = useQuery({
    queryKey: ["updates", "week", date ?? "current"],
    queryFn: () => getWeekUpdates({ data: date }),
    initialData: loaderData.week,
    staleTime: 5 * 60 * 1000
  });

  return (
    <div className="container space-y-4 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {isCurrentWeek ? "This week's top AI updates" : "Top AI updates for the selected week"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatShortUtcDate(weekStart)}
            {" - "}
            {formatShortUtcDate(weekEnd)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/week" search={{ date: formatDateParam(previousWeek) }}>
              <ChevronLeft />
              Previous Week
            </Link>
          </Button>
          {isCurrentWeek ? (
            <Button variant="outline" size="sm" disabled>
              Next Week
              <ChevronRight />
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link to="/week" search={{ date: formatDateParam(nextWeek) }}>
                Next Week
                <ChevronRight />
              </Link>
            </Button>
          )}
        </div>
      </div>
      <UpdateList
        updates={query.data ?? []}
        isLoading={query.isLoading}
      />
    </div>
  );
}
