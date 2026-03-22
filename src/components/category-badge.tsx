import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CategoryBadgeProps {
  category: string;
}

const getCategoryColor = (category: string) => {
  const normalized = category?.toLowerCase() || "";
  if (normalized.includes('model') || normalized.includes('llm')) return "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200 dark:border-blue-800";
  if (normalized.includes('tool') || normalized.includes('agent')) return "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-900";
  if (normalized.includes('research') || normalized.includes('paper')) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
  if (normalized.includes('business') || normalized.includes('startup')) return "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-800";
  if (normalized.includes('hardware') || normalized.includes('chip')) return "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 border-rose-200 dark:border-rose-800";
  if (normalized.includes('policy') || normalized.includes('safety')) return "bg-slate-100 text-slate-800 dark:bg-slate-800/80 dark:text-slate-300 border-slate-200 dark:border-slate-700";

  return "bg-secondary text-secondary-foreground border-transparent";
};

export function CategoryBadge({ category }: CategoryBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", getCategoryColor(category))}
    >
      {category}
    </Badge>
  );
}
