import { Heart, Bookmark } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserGlobalEngagement, getArticleEngagement, toggleLike, toggleBookmark } from "@/server/engagement";
import { Button } from "./ui/button";
import { useSession } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";

interface EngagementBarProps {
    updateId: string;
    variant?: "default" | "shorts";
}

export function EngagementBar({ updateId, variant = "default" }: EngagementBarProps) {
    const { data: session } = useSession();
    const { toast } = useToast();
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
    const bookmarksCount = articleEng?.bookmarksCount ?? 0;
    const isShorts = variant === "shorts";

    const requireLogin = () => {
        trackEvent("engagement_login_prompt", { update_id: updateId });
        toast({
            title: "Sign in required",
            description: "Log in to like and bookmark updates.",
        });
    };

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
            await queryClient.cancelQueries({ queryKey: ["engagement", "article", updateId] });
            const prevGlobal = queryClient.getQueryData(["engagement", "global"]);
            const prevArticle = queryClient.getQueryData(["engagement", "article", updateId]);

            queryClient.setQueryData(["engagement", "global"], (old: any) => {
                if (!old) return { likes: [], bookmarks: [updateId] };
                const isBookmarked = old.bookmarks.includes(updateId);
                return {
                    ...old,
                    bookmarks: isBookmarked ? old.bookmarks.filter((id: string) => id !== updateId) : [...old.bookmarks, updateId]
                };
            });

            queryClient.setQueryData(["engagement", "article", updateId], (old: any) => ({
                ...old,
                bookmarksCount: bookmarked ? Math.max(0, (old?.bookmarksCount ?? 1) - 1) : (old?.bookmarksCount ?? 0) + 1,
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

    if (isShorts) {
        return (
            <div className="flex flex-col items-center gap-4 text-white">
                <button
                    type="button"
                    className={`flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-black/35 shadow-xl backdrop-blur-md transition-transform active:scale-95 ${liked ? "text-red-400" : "text-white"}`}
                    onClick={() => {
                        if (!session) return requireLogin();
                        if (likeMutation.isPending) return;
                        trackEvent("update_like_click", { update_id: updateId, active: !liked });
                        likeMutation.mutate();
                    }}
                >
                    <Heart className={`h-6 w-6 ${liked ? "fill-current" : ""}`} />
                </button>
                <div className="text-center text-xs font-medium leading-tight">
                    <div>{likesCount}</div>
                    <div className="text-white/70">Likes</div>
                </div>

                <button
                    type="button"
                    className={`flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-black/35 shadow-xl backdrop-blur-md transition-transform active:scale-95 ${bookmarked ? "text-primary" : "text-white"}`}
                    onClick={() => {
                        if (!session) return requireLogin();
                        if (bookmarkMutation.isPending) return;
                        trackEvent("update_bookmark_click", { update_id: updateId, active: !bookmarked });
                        bookmarkMutation.mutate();
                    }}
                >
                    <Bookmark className={`h-6 w-6 ${bookmarked ? "fill-current" : ""}`} />
                </button>
                <div className="text-center text-xs font-medium leading-tight">
                    <div>{bookmarksCount}</div>
                    <div className="text-white/70">Saves</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-4 py-4 border-y border-border/50 my-6 text-muted-foreground">
            <Button
                variant="ghost"
                size="sm"
                className={`hover:bg-red-500/10 transition-colors ${liked ? "text-red-500 hover:text-red-600" : ""}`}
                onClick={() => {
                    if (!session) return requireLogin();
                    if (likeMutation.isPending) return;
                    trackEvent("update_like_click", { update_id: updateId, active: !liked });
                    likeMutation.mutate();
                }}
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
                    if (!session) return requireLogin();
                    if (bookmarkMutation.isPending) return;
                    trackEvent("update_bookmark_click", { update_id: updateId, active: !bookmarked });
                    bookmarkMutation.mutate();
                }}
            >
                <Bookmark className={`mr-2 h-4 w-4 ${bookmarked ? "fill-current" : ""}`} />
                <span>{bookmarksCount}</span>
                <span className="ml-1.5">Bookmarks</span>
            </Button>
        </div>
    );
}
