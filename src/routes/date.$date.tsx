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
  }
});

function DatePage() {
  const { date } = Route.useParams();
  const loaderData = Route.useLoaderData();

  const query = useQuery({
    queryKey: ["updates", "date", date],
    queryFn: () => (getUpdatesByDate as any)({ data: date }),
    initialData: loaderData.dateUpdates
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
      />
    </div>
  );
}
