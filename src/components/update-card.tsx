import { Link } from "@tanstack/react-router";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type Update } from "@/server/schema";
import { ImpactScore } from "./impact-score";
import { CategoryBadge } from "./category-badge";

interface UpdateCardProps {
  update: Update;
  featured?: boolean;
  listContext?: string;
}

export function UpdateCard({ update, featured, listContext }: UpdateCardProps) {
  const isSeen = (update as any).isSeen;

  return (
    <Link
      to="/update/$slug"
      params={{ slug: update.slug }}
      search={listContext ? { list: listContext } : undefined}
      className={`block group h-full relative ${isSeen ? 'opacity-70 hover:opacity-100' : ''}`}
    >
      <div className={`absolute -inset-0.5 bg-gradient-to-r from-primary to-purple-600 rounded-xl blur opacity-0 group-hover:opacity-20 transition duration-500 ${featured ? 'opacity-20 group-hover:opacity-40' : ''}`}></div>
      <Card className={`relative h-full transition-all duration-300 transform group-hover:-translate-y-1 group-hover:scale-[1.01] hover:shadow-2xl hover:border-primary/50 flex flex-col bg-card/80 backdrop-blur-sm ${featured ? 'border-primary/30 shadow-lg' : ''}`}>
        <CardHeader className="flex-none pb-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <CategoryBadge category={update.category} />
            <div className="flex items-center gap-2">
              <span className="text-[10px] md:text-xs font-medium text-muted-foreground/80 px-2.5 py-1 bg-muted/40 rounded-full whitespace-nowrap">
                {Math.max(1, Math.ceil((update.content?.split(' ').length || update.summary?.split(' ').length || 100) / 200))} min read
              </span>
              <span className="text-[10px] md:text-xs font-medium text-muted-foreground/80 px-2.5 py-1 bg-muted/40 rounded-full whitespace-nowrap">
                {new Date(update.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                })}
              </span>
            </div>
          </div>
          <CardTitle className={`font-bold leading-snug tracking-tight group-hover:text-primary transition-colors ${featured ? 'text-2xl md:text-3xl line-clamp-3' : 'text-xl line-clamp-2'}`}>
            {update.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between space-y-5">
          <p className={`leading-relaxed text-muted-foreground/90 ${featured ? 'text-lg line-clamp-4' : 'text-[15px] line-clamp-3'}`}>
            {update.summary}
          </p>
          <div className="pt-3 border-t border-border/40 flex justify-between items-center">
            <ImpactScore score={update.impact_score} />
            {featured && (
              <span className="text-sm font-medium text-primary flex items-center">
                Read Article &rarr;
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

