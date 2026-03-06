import { cn } from "@/lib/utils";

interface ImpactScoreProps {
  score: number;
}

export function ImpactScore({ score }: ImpactScoreProps) {
  const level =
    score >= 8 ? "high" : score >= 5 ? "medium" : "low";

  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 font-medium",
          level === "high" &&
            "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200",
          level === "medium" &&
            "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
          level === "low" &&
            "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
        )}
      >
        Impact: {score}/10
      </span>
    </div>
  );
}

