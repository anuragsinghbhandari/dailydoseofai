import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getTodayUpdates } from "@/server/queries";
import { UpdateList } from "@/components/update-list";
import { createSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/today")({
  head: () =>
    createSeoHead({
      title: "Today's AI News | AI Dose",
      description: "Read today's most important AI updates with quick summaries and detailed analysis for launches, research, tools, and policy.",
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
      <p className="max-w-3xl text-muted-foreground">
        Start with the short summary on each card, then open any update for deeper context, source links, and structured analysis.
      </p>
      <UpdateList
        updates={query.data ?? []}
        isLoading={query.isLoading}
      />
    </div>
  );
}
