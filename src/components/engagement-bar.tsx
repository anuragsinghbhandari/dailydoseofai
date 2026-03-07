import { Heart, Bookmark } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserEngagement, toggleLike, toggleBookmark } from "@/server/engagement";
import { Button } from "./ui/button";
import { useSession } from "@/lib/auth";

export function EngagementBar({ updateId }: { updateId: string }) {
    const { data: session } = useSession();
    const queryClient = useQueryClient();

    const { data } = useQuery({
        queryKey: ["engagement", updateId],
        queryFn: () => (getUserEngagement as any)({ data: { updateId } }),
        enabled: !!session,
    });

    const likeMutation = useMutation({
        mutationFn: () => (toggleLike as any)({ data: { updateId } }),
        onSuccess: (res) => {
            queryClient.setQueryData(["engagement", updateId], (old: any) => ({
                ...old,
                liked: (res as any).liked,
                likesCount: (res as any).liked ? (old?.likesCount ?? 0) + 1 : (old?.likesCount ?? 1) - 1,
            }));
        },
    });

    const bookmarkMutation = useMutation({
        mutationFn: () => (toggleBookmark as any)({ data: { updateId } }),
        onSuccess: (res) => {
            queryClient.setQueryData(["engagement", updateId], (old: any) => ({
                ...old,
                bookmarked: (res as any).bookmarked,
            }));
        },
    });

    return (
        <div className="flex items-center gap-4 py-4 border-y border-border/50 my-6 text-muted-foreground">
            <Button
                variant="ghost"
                size="sm"
                className={`hover:bg-red-500/10 transition-colors ${data?.liked ? "text-red-500 hover:text-red-600" : ""}`}
                onClick={() => {
                    if (!session) return alert("Please sign in to like this.");
                    likeMutation.mutate();
                }}
                disabled={likeMutation.isPending}
            >
                <Heart className={`mr-2 h-4 w-4 ${data?.liked ? "fill-current" : ""}`} />
                <span>{data?.likesCount ?? 0}</span>
                <span className="ml-1.5">Likes</span>
            </Button>
            <div className="w-px h-6 bg-border/50" />
            <Button
                variant="ghost"
                size="sm"
                className={`hover:bg-primary/10 transition-colors ${data?.bookmarked ? "text-primary hover:text-primary/80" : ""}`}
                onClick={() => {
                    if (!session) return alert("Please sign in to bookmark this.");
                    bookmarkMutation.mutate();
                }}
                disabled={bookmarkMutation.isPending}
            >
                <Bookmark className={`mr-2 h-4 w-4 ${data?.bookmarked ? "fill-current" : ""}`} />
                Bookmark
            </Button>
        </div>
    );
}
