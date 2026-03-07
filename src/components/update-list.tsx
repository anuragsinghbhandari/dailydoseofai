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

  const visibleUpdates = updates.slice(0, displayCount);
  const hasMore = displayCount < updates.length;

  return (
    <div className="space-y-8">
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

