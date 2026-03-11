import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getBookmarkedUpdates } from "@/server/engagement";
import { UpdateList } from "@/components/update-list";
import { useSession } from "@/lib/auth";

export const Route = createFileRoute("/bookmarks")({
  component: BookmarksPage
});

function BookmarksPage() {
  const { data: session } = useSession();
  const query = useQuery({
    queryKey: ["updates", "bookmarks"],
    queryFn: () => (getBookmarkedUpdates as any)(),
    enabled: !!session
  });

  if (!session) {
    return (
      <div className="container py-32 text-center space-y-4">
        <h2 className="text-3xl font-heading font-bold">Sign in to see bookmarks</h2>
        <p className="text-muted-foreground mx-auto max-w-md">
          Keep track of important AI stories by bookmarking them. You need an account to save your favorite updates.
        </p>
      </div>
    );
  }

  return (
    <div className="container space-y-8 py-12">
      <div className="space-y-2">
        <h1 className="text-4xl font-heading font-bold tracking-tight">
          Your Bookmarks
        </h1>
        <p className="text-muted-foreground">
          All the AI stories you've saved for later.
        </p>
      </div>
      <UpdateList
        updates={query.data ?? []}
        isLoading={query.isLoading}
        listContext="bookmarks"
      />
      {!query.isLoading && query.data?.length === 0 && (
        <div className="py-20 text-center border rounded-2xl border-dashed border-border/50">
          <p className="text-muted-foreground">You haven't bookmarked any updates yet.</p>
        </div>
      )}
    </div>
  );
}
