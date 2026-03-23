import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getMonthUpdates } from "@/server/queries";
import { UpdateList } from "@/components/update-list";
import { createSeoHead } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { z } from "zod";

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
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getMonthStart(anchor?: string) {
  const base = anchor ? new Date(`${anchor}T00:00:00`) : new Date();
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  return start;
}

function MonthPage() {
  const loaderData = Route.useLoaderData();
  const { date } = Route.useSearch();
  const monthStart = getMonthStart(date);

  const previousMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
  const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

  const currentMonthStart = getMonthStart();
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
            {monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
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
