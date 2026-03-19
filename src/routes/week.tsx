import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getWeekUpdates } from "@/server/queries";
import { UpdateList } from "@/components/update-list";
import { createSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/week")({
  head: () =>
    createSeoHead({
      title: "This Week in AI | AI Dose",
      description: "Catch up on the biggest AI stories, releases, and developments from the current week.",
      pathname: "/week"
    }),
  component: WeekPage,
  loader: async () => {
    const week = await getWeekUpdates();
    return { week };
  }
});

function WeekPage() {
  const loaderData = Route.useLoaderData();

  const query = useQuery({
    queryKey: ["updates", "week"],
    queryFn: () => getWeekUpdates(),
    initialData: loaderData.week,
    staleTime: 5 * 60 * 1000
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
