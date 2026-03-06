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
}

export function UpdateCard({ update }: UpdateCardProps) {
  return (
    <Link
      to="/update/$slug"
      params={{ slug: update.slug }}
      className="block group h-full relative"
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-purple-600 rounded-xl blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
      <Card className="relative h-full transition-all duration-300 transform group-hover:-translate-y-1 group-hover:scale-[1.01] hover:shadow-2xl hover:border-primary/50 flex flex-col bg-card/80 backdrop-blur-sm">
        <CardHeader className="flex-none pb-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <CategoryBadge category={update.category} />
            <span className="text-xs font-medium text-muted-foreground/80 px-2.5 py-1 bg-muted/40 rounded-full whitespace-nowrap">
              {new Date(update.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric"
              })}
            </span>
          </div>
          <CardTitle className="text-xl font-bold leading-snug tracking-tight line-clamp-2 group-hover:text-primary transition-colors">
            {update.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between space-y-5">
          <p className="text-[15px] leading-relaxed text-muted-foreground/90 line-clamp-3">
            {update.summary}
          </p>
          <div className="pt-3 border-t border-border/40">
            <ImpactScore score={update.impact_score} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

