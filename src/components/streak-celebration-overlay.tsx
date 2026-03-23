import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { useSession } from "@/lib/auth";
import { getUserStreak } from "@/server/engagement";
import type { ViewerState } from "@/server/auth-state";
import { useStreakCelebration } from "@/hooks/use-streak-celebration";

interface StreakCelebrationOverlayProps {
  initialViewer?: ViewerState | null;
}

const PARTICLES = [
  { left: "6%", delay: "0ms", duration: "1100ms", drift: "-26px", size: "h-3 w-3", color: "bg-orange-400" },
  { left: "12%", delay: "80ms", duration: "1250ms", drift: "34px", size: "h-2.5 w-2.5", color: "bg-amber-300" },
  { left: "18%", delay: "40ms", duration: "1180ms", drift: "-18px", size: "h-4 w-4", color: "bg-rose-400" },
  { left: "25%", delay: "140ms", duration: "1280ms", drift: "28px", size: "h-3.5 w-3.5", color: "bg-orange-500" },
  { left: "32%", delay: "30ms", duration: "1160ms", drift: "-22px", size: "h-2.5 w-2.5", color: "bg-yellow-300" },
  { left: "39%", delay: "170ms", duration: "1350ms", drift: "36px", size: "h-4 w-4", color: "bg-orange-300" },
  { left: "46%", delay: "70ms", duration: "1220ms", drift: "-14px", size: "h-3 w-3", color: "bg-red-400" },
  { left: "53%", delay: "20ms", duration: "1200ms", drift: "18px", size: "h-4 w-4", color: "bg-amber-400" },
  { left: "60%", delay: "160ms", duration: "1330ms", drift: "-30px", size: "h-3 w-3", color: "bg-orange-500" },
  { left: "67%", delay: "60ms", duration: "1170ms", drift: "24px", size: "h-2.5 w-2.5", color: "bg-yellow-400" },
  { left: "74%", delay: "120ms", duration: "1260ms", drift: "-20px", size: "h-4 w-4", color: "bg-rose-300" },
  { left: "81%", delay: "10ms", duration: "1210ms", drift: "30px", size: "h-3.5 w-3.5", color: "bg-orange-400" },
  { left: "88%", delay: "150ms", duration: "1320ms", drift: "-16px", size: "h-3 w-3", color: "bg-amber-300" },
  { left: "94%", delay: "90ms", duration: "1190ms", drift: "20px", size: "h-2.5 w-2.5", color: "bg-red-300" },
];

export function StreakCelebrationOverlay({ initialViewer }: StreakCelebrationOverlayProps) {
  const { data: clientSession, isPending } = useSession();
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

  const streak = streakQuery.data?.streak ?? 0;
  const isCelebrating = useStreakCelebration(streak);

  if (!session || !isCelebrating) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[120] overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,146,60,0.18),transparent_55%)] animate-[streak-screen-glow_1.2s_ease-out]" />
      <div className="absolute left-1/2 top-[18%] -translate-x-1/2 animate-[streak-badge-burst_1.2s_ease-out]">
        <div className="flex items-center gap-2 rounded-full border border-orange-400/40 bg-background/85 px-4 py-2 text-sm font-semibold text-foreground shadow-2xl backdrop-blur">
          <Flame className="h-5 w-5 text-orange-500" />
          Streak +1
        </div>
      </div>

      {PARTICLES.map((particle, index) => (
        <span
          key={`${particle.left}-${index}`}
          className={`absolute top-[-8%] rounded-full opacity-90 ${particle.size} ${particle.color} animate-[streak-confetti-fall_var(--streak-duration)_ease-out_forwards]`}
          style={{
            left: particle.left,
            animationDelay: particle.delay,
            ["--streak-duration" as string]: particle.duration,
            ["--streak-drift" as string]: particle.drift,
          }}
        />
      ))}
    </div>
  );
}
