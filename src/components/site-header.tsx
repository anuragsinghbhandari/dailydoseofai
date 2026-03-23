import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { AuthButton } from "./auth-button";
import { useSession } from "@/lib/auth";
import { getUserStreak } from "@/server/engagement";
import type { ViewerState } from "@/server/auth-state";
import { useStreakCelebration } from "@/hooks/use-streak-celebration";

interface SiteHeaderProps {
    initialViewer?: ViewerState | null;
}

export function SiteHeader({ initialViewer }: SiteHeaderProps) {
    const { data: clientSession, isPending } = useSession();
    const session = isPending
        ? initialViewer?.session ?? null
        : clientSession ?? null;
    const streakQuery = useQuery({
        queryKey: ["user", "streak"],
        queryFn: () => getUserStreak(),
        enabled: !!session,
        initialData: initialViewer?.session
            ? {
                streak: initialViewer.streak,
                lastActiveDate: initialViewer.lastActiveDate,
            }
            : undefined,
        staleTime: 5 * 60 * 1000,
        refetchOnMount: false,
    });
    const streak = streakQuery.data?.streak ?? 0;
    const isCelebratingStreak = useStreakCelebration(streak);

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 transition-all">
            <div className="container flex h-16 items-center gap-6">
                <Link to="/" className="flex items-center space-x-2">
                    <span className="font-heading font-bold text-xl tracking-[0.18em] uppercase text-foreground">
                        AI Dose
                    </span>
                </Link>
                <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
                    <nav className="flex items-center space-x-6">
                        <Link
                            to="/"
                            className="text-sm font-medium transition-colors hover:text-primary"
                            activeProps={{ className: "text-foreground font-semibold" }}
                            inactiveProps={{ className: "text-foreground/60" }}
                        >
                            Home
                        </Link>
                        {session && (
                            <Link
                                to="/bookmarks"
                                className="text-sm font-medium transition-colors hover:text-primary"
                                activeProps={{ className: "text-foreground font-semibold" }}
                                inactiveProps={{ className: "text-foreground/60" }}
                            >
                                Bookmarks
                            </Link>
                        )}
                    </nav>
                    <div className="flex items-center gap-2 pl-4 border-l border-border/50">
                        {session && (
                            <div className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-sm font-medium text-foreground ${isCelebratingStreak ? "animate-[streak-pop_1.2s_ease-out]" : ""}`}>
                                <Flame className={`h-4 w-4 text-orange-500 ${isCelebratingStreak ? "animate-[streak-flare_1.2s_ease-out]" : ""}`} />
                                <span>{streak}</span>
                            </div>
                        )}
                        <ThemeToggle />
                        <AuthButton initialViewer={initialViewer} />
                    </div>
                </div>
            </div>
        </header>
    );
}
