import { Skeleton } from "@/components/ui/skeleton";
import type { Update } from "@/server/schema";
import { UpdateCard } from "./update-card";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface UpdateListProps {
  updates?: Update[];
  isLoading?: boolean;
}

export function UpdateList({ updates, isLoading }: UpdateListProps) {
  const [displayCount, setDisplayCount] = useState(20);
  const [showUnseenOnly, setShowUnseenOnly] = useState(false);

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!updates || updates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-muted/20 rounded-2xl border border-dashed border-border/50">
        <p className="text-muted-foreground font-medium">
          No updates found for this period.
        </p>
      </div>
    );
  }

  const filteredUpdates = showUnseenOnly ? updates.filter(u => !(u as any).isSeen) : updates;
  const visibleUpdates = filteredUpdates.slice(0, displayCount);
  const hasMore = displayCount < filteredUpdates.length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-end space-x-2 mb-4">
        <span className="text-sm font-medium text-muted-foreground">Show unseen only</span>
        <button
          role="switch"
          aria-checked={showUnseenOnly}
          onClick={() => setShowUnseenOnly(!showUnseenOnly)}
          className={`peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${showUnseenOnly ? 'bg-primary' : 'bg-input'}`}
        >
          <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${showUnseenOnly ? 'translate-x-4' : 'translate-x-0'}`} />
        </button>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
        {visibleUpdates.map((update) => (
          <UpdateCard key={update.id} update={update} />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setDisplayCount((prev) => prev + 20)}
            className="rounded-xl px-8"
          >
            Load More News
          </Button>
        </div>
      )}
    </div>
  );
}

