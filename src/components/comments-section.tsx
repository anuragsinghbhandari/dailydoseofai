import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getComments, addComment } from "@/server/engagement";
import { useSession } from "@/lib/auth";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { formatShortUtcDate } from "@/lib/dates";

export function CommentsSection({ updateId }: { updateId: string }) {
    const { data: session } = useSession();
    const queryClient = useQueryClient();
    const [content, setContent] = useState("");

    const { data: comments, isLoading } = useQuery({
        queryKey: ["comments", updateId],
        queryFn: () => (getComments as any)({ data: { updateId } }),
    });

    const addMutation = useMutation({
        mutationFn: () => (addComment as any)({ data: { updateId, content } }),
        onSuccess: () => {
            setContent("");
            queryClient.invalidateQueries({ queryKey: ["comments", updateId] });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        addMutation.mutate();
    };

    return (
        <div className="py-8">
            <h3 className="text-xl font-semibold mb-6">Comments</h3>

            {session ? (
                <form onSubmit={handleSubmit} className="mb-8">
                    <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Add a comment..."
                        className="mb-3 resize-none bg-background/50 border-border/50"
                        rows={3}
                    />
                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            disabled={!content.trim() || addMutation.isPending}
                            size="sm"
                            className="bg-primary/90 hover:bg-primary"
                        >
                            Post Comment
                        </Button>
                    </div>
                </form>
            ) : (
                <div className="p-4 bg-muted/30 border border-dashed rounded-xl text-center mb-8">
                    <p className="text-sm text-muted-foreground">Sign in to leave a comment.</p>
                </div>
            )}

            {isLoading ? (
                <div className="text-sm text-muted-foreground">Loading comments...</div>
            ) : comments && Array.isArray(comments) && comments.length > 0 ? (
                <div className="space-y-6">
                    {comments.map((comment: any) => (
                        <div key={comment.id} className="flex gap-4">
                            <Avatar className="h-8 w-8 mt-1">
                                <AvatarImage src={comment.user?.image || ""} />
                                <AvatarFallback>{comment.user?.name?.charAt(0) || "U"}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-sm">{comment.user?.name || "Anonymous"}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {formatShortUtcDate(comment.created_at)}
                                    </span>
                                </div>
                                <p className="text-sm leading-relaxed text-foreground/90">{comment.content}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-sm text-muted-foreground">No comments yet. Be the first to comment!</div>
            )}
        </div>
    );
}
