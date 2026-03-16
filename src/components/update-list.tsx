import { Skeleton } from "@/components/ui/skeleton";
import type { Update } from "@/server/schema";
import { UpdateCard } from "./update-card";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useSession } from "@/lib/auth";
import { getSeenUpdateIds } from "@/lib/local-seen";
import { useQueryClient } from "@tanstack/react-query";

const containerVariants: any = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

interface UpdateListProps {
  updates?: Update[];
  isLoading?: boolean;
  listContext?: string;
  returnDate?: string;
  filterStorageKey?: string;
  skipInitialAnimation?: boolean;
}

function getStoredShowUnseenOnly(filterStorageKey?: string) {
  if (!filterStorageKey || typeof window === "undefined") return false;

  return window.localStorage.getItem(`update-list:${filterStorageKey}:show-unseen-only`) === "true";
}

function getInitialGuestSeenUpdateIds() {
  if (typeof window === "undefined") return [];
  return getSeenUpdateIds();
}

export function UpdateList({ updates, isLoading, listContext, returnDate, filterStorageKey, skipInitialAnimation }: UpdateListProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [displayCount, setDisplayCount] = useState(20);
  const [showUnseenOnly, setShowUnseenOnly] = useState(() => getStoredShowUnseenOnly(filterStorageKey));
  const [guestSeenUpdateIds, setGuestSeenUpdateIds] = useState<string[]>(() => getInitialGuestSeenUpdateIds());
  const previousSessionUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!filterStorageKey || typeof window === "undefined") return;
    window.localStorage.setItem(
      `update-list:${filterStorageKey}:show-unseen-only`,
      String(showUnseenOnly)
    );
  }, [filterStorageKey, showUnseenOnly]);

  useEffect(() => {
    setShowUnseenOnly(getStoredShowUnseenOnly(filterStorageKey));
  }, [filterStorageKey]);

  useEffect(() => {
    if (session || typeof window === "undefined") {
      setGuestSeenUpdateIds([]);
      return;
    }

    const syncGuestSeenUpdates = () => {
      setGuestSeenUpdateIds(getSeenUpdateIds());
    };

    syncGuestSeenUpdates();
    window.addEventListener("storage", syncGuestSeenUpdates);

    return () => {
      window.removeEventListener("storage", syncGuestSeenUpdates);
    };
  }, [session]);

  useEffect(() => {
    const sessionUserId = session?.user?.id ?? null;

    if (previousSessionUserIdRef.current === undefined) {
      previousSessionUserIdRef.current = sessionUserId;
      if (sessionUserId) {
        queryClient.invalidateQueries({ queryKey: ["updates"] }).catch(() => {});
      }
      return;
    }

    if (previousSessionUserIdRef.current !== sessionUserId) {
      previousSessionUserIdRef.current = sessionUserId;
      queryClient.invalidateQueries({ queryKey: ["updates"] }).catch(() => {});
    }
  }, [queryClient, session?.user?.id]);

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

  const guestSeenSet = new Set(guestSeenUpdateIds);
  const effectiveUpdates = updates.map((update) => ({
    ...update,
    isSeen: (update as any).isSeen || (!session && guestSeenSet.has(update.id))
  }));

  const filteredUpdates = showUnseenOnly ? effectiveUpdates.filter(u => !(u as any).isSeen) : effectiveUpdates;
  const visibleUpdates = filteredUpdates.slice(0, displayCount);
  const hasMore = displayCount < filteredUpdates.length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-end space-x-2 mb-4">
        <span className="text-sm font-medium text-muted-foreground">Show unseen only</span>
        <button
          role="switch"
          aria-checked={showUnseenOnly}
          onClick={() => {
            setShowUnseenOnly(!showUnseenOnly);
            setDisplayCount(20);
          }}
          className={`peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${showUnseenOnly ? 'bg-primary' : 'bg-input'}`}
        >
          <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${showUnseenOnly ? 'translate-x-4' : 'translate-x-0'}`} />
        </button>
      </div>
      <motion.div
        variants={containerVariants}
        initial={skipInitialAnimation ? false : "hidden"}
        animate="show"
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {visibleUpdates.map((update, index) => (
          <motion.div
            key={update.id}
            variants={itemVariants}
            initial={skipInitialAnimation ? false : undefined}
            className={index === 0 ? 'md:col-span-2 lg:col-span-2' : ''}
          >
            <UpdateCard update={update} featured={index === 0} listContext={listContext} returnDate={returnDate} />
          </motion.div>
        ))}
      </motion.div>

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
