import { Heart, Bookmark } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserGlobalEngagement, getArticleEngagement, toggleLike, toggleBookmark } from "@/server/engagement";
import { Button } from "./ui/button";
import { useSession } from "@/lib/auth";

export function EngagementBar({ updateId }: { updateId: string }) {
    const { data: session } = useSession();
    const queryClient = useQueryClient();

    const { data: globalEng } = useQuery({
        queryKey: ["engagement", "global"],
        queryFn: () => (getUserGlobalEngagement as any)(),
        enabled: !!session,
        staleTime: Infinity,
    });

    const { data: articleEng } = useQuery({
        queryKey: ["engagement", "article", updateId],
        queryFn: () => (getArticleEngagement as any)({ data: { updateId } }),
    });

    const liked = globalEng?.likes?.includes(updateId) ?? false;
    const bookmarked = globalEng?.bookmarks?.includes(updateId) ?? false;
    const likesCount = articleEng?.likesCount ?? 0;

    const likeMutation = useMutation({
        mutationFn: () => (toggleLike as any)({ data: { updateId } }),
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ["engagement", "global"] });
            await queryClient.cancelQueries({ queryKey: ["engagement", "article", updateId] });

            const prevGlobal = queryClient.getQueryData(["engagement", "global"]);
            const prevArticle = queryClient.getQueryData(["engagement", "article", updateId]);

            queryClient.setQueryData(["engagement", "global"], (old: any) => {
                if (!old) return { likes: [updateId], bookmarks: [] };
                const isLiked = old.likes.includes(updateId);
                return {
                    ...old,
                    likes: isLiked ? old.likes.filter((id: string) => id !== updateId) : [...old.likes, updateId]
                };
            });

            queryClient.setQueryData(["engagement", "article", updateId], (old: any) => ({
                ...old,
                likesCount: liked ? Math.max(0, (old?.likesCount ?? 1) - 1) : (old?.likesCount ?? 0) + 1,
            }));

            return { prevGlobal, prevArticle };
        },
        onError: (err, variables, context: any) => {
            if (context?.prevGlobal) queryClient.setQueryData(["engagement", "global"], context.prevGlobal);
            if (context?.prevArticle) queryClient.setQueryData(["engagement", "article", updateId], context.prevArticle);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["engagement", "global"] });
            queryClient.invalidateQueries({ queryKey: ["engagement", "article", updateId] });
        },
    });

    const bookmarkMutation = useMutation({
        mutationFn: () => (toggleBookmark as any)({ data: { updateId } }),
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ["engagement", "global"] });
            const prevGlobal = queryClient.getQueryData(["engagement", "global"]);

            queryClient.setQueryData(["engagement", "global"], (old: any) => {
                if (!old) return { likes: [], bookmarks: [updateId] };
                const isBookmarked = old.bookmarks.includes(updateId);
                return {
                    ...old,
                    bookmarks: isBookmarked ? old.bookmarks.filter((id: string) => id !== updateId) : [...old.bookmarks, updateId]
                };
            });

            return { prevGlobal };
        },
        onError: (err, variables, context: any) => {
            if (context?.prevGlobal) queryClient.setQueryData(["engagement", "global"], context.prevGlobal);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["engagement", "global"] });
        },
    });

    return (
        <div className="flex items-center gap-4 py-4 border-y border-border/50 my-6 text-muted-foreground">
            <Button
                variant="ghost"
                size="sm"
                className={`hover:bg-red-500/10 transition-colors ${liked ? "text-red-500 hover:text-red-600" : ""}`}
                onClick={() => {
                    if (!session) return alert("Please sign in to like this.");
                    likeMutation.mutate();
                }}
                disabled={likeMutation.isPending}
            >
                <Heart className={`mr-2 h-4 w-4 ${liked ? "fill-current" : ""}`} />
                <span>{likesCount}</span>
                <span className="ml-1.5">Likes</span>
            </Button>
            <div className="w-px h-6 bg-border/50" />
            <Button
                variant="ghost"
                size="sm"
                className={`hover:bg-primary/10 transition-colors ${bookmarked ? "text-primary hover:text-primary/80" : ""}`}
                onClick={() => {
                    if (!session) return alert("Please sign in to bookmark this.");
                    bookmarkMutation.mutate();
                }}
                disabled={bookmarkMutation.isPending}
            >
                <Bookmark className={`mr-2 h-4 w-4 ${bookmarked ? "fill-current" : ""}`} />
                Bookmark
            </Button>
        </div>
    );
}
