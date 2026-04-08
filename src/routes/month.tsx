import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getMonthUpdates } from "@/server/queries";
import { UpdateList } from "@/components/update-list";
import { createSeoHead } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { z } from "zod";
import { formatUtcMonthYear, getUtcDateKey, getUtcMonthStart, parseUtcDateKey } from "@/lib/dates";

export const Route = createFileRoute("/month")({
  validateSearch: z.object({
    date: z.string().optional()
  }),
  head: () =>
    createSeoHead({
      title: "This Month in AI | AI Dose",
      description: "Browse the most important AI news and trends from this month on AI Dose.",
      pathname: "/month"
    }),
  component: MonthPage,
  loaderDeps: ({ search: { date } }) => ({ date }),
  loader: async ({ deps: { date } }) => {
    const month = await getMonthUpdates({ data: date });
    return { month };
  }
});

function formatDateParam(date: Date) {
  return getUtcDateKey(date);
}

function MonthPage() {
  const loaderData = Route.useLoaderData();
  const { date } = Route.useSearch();
  const monthStart = getUtcMonthStart(date ? parseUtcDateKey(date) ?? undefined : undefined);

  const previousMonth = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() - 1, 1));
  const nextMonth = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));

  const currentMonthStart = getUtcMonthStart();
  const isCurrentMonth = monthStart.getTime() === currentMonthStart.getTime();

  const query = useQuery({
    queryKey: ["updates", "month", date ?? "current"],
    queryFn: () => getMonthUpdates({ data: date }),
    initialData: loaderData.month,
    staleTime: 5 * 60 * 1000
  });

  return (
    <div className="container space-y-4 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {isCurrentMonth ? "This month's top AI updates" : "Top AI updates for the selected month"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatUtcMonthYear(monthStart)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/month" search={{ date: formatDateParam(previousMonth) }}>
              <ChevronLeft />
              Previous Month
            </Link>
          </Button>
          {isCurrentMonth ? (
            <Button variant="outline" size="sm" disabled>
              Next Month
              <ChevronRight />
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link to="/month" search={{ date: formatDateParam(nextMonth) }}>
                Next Month
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
