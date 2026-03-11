import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getTodayUpdates } from "@/server/queries";
import { UpdateList } from "@/components/update-list";

export const Route = createFileRoute("/today")({
  component: TodayPage,
  loader: async () => {
    const today = await getTodayUpdates();
    return { today };
  }
});

function TodayPage() {
  const loaderData = Route.useLoaderData();

  const query = useQuery({
    queryKey: ["updates", "today"],
    queryFn: () => getTodayUpdates(),
    initialData: loaderData.today
  });

  return (
    <div className="container space-y-4 py-8">
      <h1 className="text-2xl font-bold">
        Today's top AI updates
      </h1>
      <UpdateList
        updates={query.data ?? []}
        isLoading={query.isLoading}
      />
    </div>
  );
}

