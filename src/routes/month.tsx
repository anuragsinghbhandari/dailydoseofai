import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getMonthUpdates } from "@/server/queries";
import { UpdateList } from "@/components/update-list";

export const Route = createFileRoute("/month")({
  component: MonthPage
});

function MonthPage() {
  const query = useQuery({
    queryKey: ["updates", "month"],
    queryFn: () => getMonthUpdates()
  });

  return (
    <div className="container space-y-4 py-8">
      <h1 className="text-2xl font-bold">
        This month's top AI updates
      </h1>
      <UpdateList
        updates={query.data ?? []}
        isLoading={query.isLoading}
      />
    </div>
  );
}

