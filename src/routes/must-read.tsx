import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getMustReads } from "@/server/queries";
import { UpdateList } from "@/components/update-list";

export const Route = createFileRoute("/must-read")({
    component: MustReadPage,
    loader: async () => {
        const mustReads = await getMustReads();
        return { mustReads };
    }
});

function MustReadPage() {
    const loaderData = Route.useLoaderData();

    const query = useQuery({
        queryKey: ["updates", "must-read"],
        queryFn: () => getMustReads(),
        initialData: loaderData.mustReads,
        staleTime: 5 * 60 * 1000
    });

    return (
        <div className="container py-12 space-y-12 min-h-[calc(100vh-4rem)]">
            <div className="space-y-4 max-w-2xl">
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-extrabold tracking-tight">
                    Must Read
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                    The most essential AI updates, tools, and research you absolutely shouldn't miss.
                </p>
            </div>

            <UpdateList
                updates={query.data ?? []}
                isLoading={query.isLoading}
                listContext="must-read"
                filterStorageKey="must-read"
            />
        </div>
    );
}
