import { signIn, signOut, useSession } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Flame } from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useState, useEffect } from "react";
import { getUserStreak } from "@/server/engagement";
import type { ViewerState } from "@/server/auth-state";

interface AuthButtonProps {
    initialViewer?: ViewerState | null;
}

export function AuthButton({ initialViewer }: AuthButtonProps) {
    const [mounted, setMounted] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const { data: clientSession, isPending } = useSession();
    const queryClient = useQueryClient();
    const router = useRouter();
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

    useEffect(() => {
        setMounted(true);
    }, []);

    async function handleLogout() {
        setIsLoggingOut(true);

        try {
            await signOut();
            queryClient.removeQueries({ queryKey: ["user", "streak"] });
            await router.invalidate();
        } finally {
            setIsLoggingOut(false);
        }
    }

    // Don't render auth UI during SSR - prevents HTTPError from useSession fetch
    if (!mounted && !session) {
        return <Button variant="outline" size="sm" disabled>...</Button>;
    }

    if (isPending && !session) {
        return <Button variant="outline" size="sm" disabled>...</Button>;
    }

    if (session) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={session.user.image || ""} alt={session.user.name} />
                            <AvatarFallback>{session.user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex flex-col space-y-1 p-2 border-b">
                        <p className="text-sm font-medium leading-none">{session.user.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {session.user.email}
                        </p>
                    </div>
                    <div className="flex items-center justify-between px-2 py-2 border-b text-sm">
                        <span className="text-muted-foreground">Current streak</span>
                        <span className="inline-flex items-center gap-1 font-medium">
                            <Flame className="h-4 w-4 text-orange-500" />
                            {streakQuery.data?.streak ?? 0} day{(streakQuery.data?.streak ?? 0) === 1 ? "" : "s"}
                        </span>
                    </div>
                    <DropdownMenuItem
                        className="cursor-pointer"
                        disabled={isLoggingOut}
                        onClick={() => {
                            void handleLogout();
                        }}
                    >
                        Log out
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return (
        <Button variant="default" size="sm" onClick={() => signIn.social({ provider: "google" })}>
            Login
        </Button>
    );
}
