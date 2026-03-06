import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getWeekUpdates } from "@/server/queries";
import { UpdateList } from "@/components/update-list";

export const Route = createFileRoute("/week")({
  component: WeekPage
});

function WeekPage() {
  const query = useQuery({
    queryKey: ["updates", "week"],
    queryFn: () => getWeekUpdates()
  });

  return (
    <div className="container space-y-4 py-8">
      <h1 className="text-2xl font-bold">
        This week's top AI updates
      </h1>
      <UpdateList
        updates={query.data ?? []}
        isLoading={query.isLoading}
      />
    </div>
  );
}

