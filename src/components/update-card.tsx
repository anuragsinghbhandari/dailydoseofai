import { Link } from "@tanstack/react-router";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from "@/components/ui/card";
import { type Update } from "@/server/schema";
import { ImpactScore } from "./impact-score";
import { CategoryBadge } from "./category-badge";
import { saveCurrentScrollPosition } from "@/lib/scroll-memory";
import { formatShortUtcDate } from "@/lib/dates";

interface UpdateCardProps {
  update: Update;
  featured?: boolean;
  listContext?: string;
  returnDate?: string;
}

export function UpdateCard({ update, featured, listContext, returnDate }: UpdateCardProps) {
  const isSeen = (update as any).isSeen;

  return (
    <Link
      to="/update/$slug"
      params={{ slug: update.slug }}
      search={listContext || returnDate ? { ...(listContext ? { list: listContext } : {}), ...(returnDate ? { date: returnDate } : {}) } : undefined}
      onClick={() => {
        if (!listContext && typeof window !== "undefined" && window.location.pathname === "/") {
          saveCurrentScrollPosition();
        }
      }}
      className={`block group h-full relative ${isSeen ? 'opacity-70 hover:opacity-100' : ''}`}
    >
      <Card className={`relative h-full overflow-hidden transition-all duration-300 transform group-hover:-translate-y-1 hover:shadow-xl hover:border-primary/40 flex flex-col bg-card ${featured ? 'border-primary/30 shadow-lg' : ''}`}>
        <div className={`absolute inset-x-0 top-0 h-1 ${featured ? 'bg-primary/70' : 'bg-border/70'} transition-colors group-hover:bg-primary/70`} />
        <CardHeader className="flex-none pb-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <CategoryBadge category={update.category} />
            <div className="flex items-center gap-2">
              <span className="text-[10px] md:text-xs font-medium text-muted-foreground/80 px-2.5 py-1 bg-muted/40 rounded-full whitespace-nowrap">
                {Math.max(1, Math.ceil((update.content?.split(' ').length || update.summary?.split(' ').length || 100) / 200))} min read
              </span>
              <span className="text-[10px] md:text-xs font-medium text-muted-foreground/80 px-2.5 py-1 bg-muted/40 rounded-full whitespace-nowrap">
                {formatShortUtcDate(update.created_at)}
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
