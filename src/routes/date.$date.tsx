import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getUpdatesByDate } from "@/server/queries";
import { UpdateList } from "@/components/update-list";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/date/$date")({
  component: DatePage,
  loader: async ({ params }) => {
    const dateUpdates = await (getUpdatesByDate as any)({ data: params.date });
    return { dateUpdates };
  },
  pendingComponent: () => (
    <div className="container space-y-8 py-12">
      <div className="h-4 w-32 bg-muted rounded animate-pulse mb-8" />
      <div className="space-y-4 mb-12">
        <div className="h-10 w-64 bg-muted rounded animate-pulse" />
        <div className="h-5 w-96 bg-muted rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-[400px] w-full bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  )
});

function DatePage() {
  const { date } = Route.useParams();
  const loaderData = Route.useLoaderData();

  const query = useQuery({
    queryKey: ["updates", "date", date],
    queryFn: () => (getUpdatesByDate as any)({ data: date }),
    initialData: loaderData.dateUpdates,
    staleTime: 5 * 60 * 1000
  });

  const dateObj = new Date(`${date}T12:00:00`); // use noon to avoid timezone shifts throwing off the day
  const displayDate = isNaN(dateObj.getTime()) ? date : dateObj.toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="container space-y-8 py-12">
      <Link
        to="/"
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-2"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to calendars
      </Link>

      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-heading font-bold tracking-tight">
          Updates for {displayDate}
        </h1>
        <p className="text-muted-foreground">Catch up on everything that happened this day.</p>
      </div>

      <UpdateList
        updates={query.data ?? []}
        isLoading={query.isLoading}
        returnDate={date}
        filterStorageKey={`date-${date}`}
      />
    </div>
  );
}
