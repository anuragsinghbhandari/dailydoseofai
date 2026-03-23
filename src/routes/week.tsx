import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getWeekUpdates } from "@/server/queries";
import { UpdateList } from "@/components/update-list";
import { createSeoHead } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { z } from "zod";

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
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getWeekStart(anchor?: string) {
  const base = anchor ? new Date(`${anchor}T00:00:00`) : new Date();
  const day = base.getDay();
  const diff = base.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(base);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function WeekPage() {
  const loaderData = Route.useLoaderData();
  const { date } = Route.useSearch();
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const previousWeek = new Date(weekStart);
  previousWeek.setDate(weekStart.getDate() - 7);

  const nextWeek = new Date(weekStart);
  nextWeek.setDate(weekStart.getDate() + 7);

  const currentWeekStart = getWeekStart();
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
            {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            {" - "}
            {weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
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
