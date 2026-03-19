import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { AuthButton } from "./auth-button";
import { useSession } from "@/lib/auth";
import { getUserStreak } from "@/server/engagement";

export function SiteHeader() {
    const { data: session } = useSession();
    const streakQuery = useQuery({
        queryKey: ["user", "streak"],
        queryFn: () => getUserStreak(),
        enabled: !!session,
        staleTime: 60 * 1000,
    });

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/40 backdrop-blur-xl supports-[backdrop-filter]:bg-background/20 transition-all">
            <div className="container flex h-16 items-center gap-6">
                <Link to="/" className="flex items-center space-x-2">
                    <span className="font-heading font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-500">
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
                            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-sm font-medium text-foreground">
                                <Flame className="h-4 w-4 text-orange-500" />
                                <span>{streakQuery.data?.streak ?? 0}</span>
                            </div>
                        )}
                        <ThemeToggle />
                        <AuthButton />
                    </div>
                </div>
            </div>
        </header>
    );
}
