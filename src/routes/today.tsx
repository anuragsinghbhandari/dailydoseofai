import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getTodayUpdates } from "@/server/queries";
import { UpdateList } from "@/components/update-list";
import { createSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/today")({
  head: () =>
    createSeoHead({
      title: "Today's AI News | AI Dose",
      description: "Read today's most important AI updates, launches, and announcements in one place.",
      pathname: "/today"
    }),
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
    initialData: loaderData.today,
    staleTime: 5 * 60 * 1000
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
