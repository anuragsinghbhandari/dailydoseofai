import { Skeleton } from "@/components/ui/skeleton";
import type { Update } from "@/server/schema";
import { UpdateCard } from "./update-card";

interface UpdateListProps {
  updates?: Update[];
  isLoading?: boolean;
}

export function UpdateList({ updates, isLoading }: UpdateListProps) {
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

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
      {updates.map((update) => (
        <UpdateCard key={update.id} update={update} />
      ))}
    </div>
  );
}

