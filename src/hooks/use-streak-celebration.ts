import { useEffect, useRef, useState } from "react";

export function useStreakCelebration(streak: number) {
  const previousStreakRef = useRef<number | null>(null);
  const [isCelebrating, setIsCelebrating] = useState(false);

  useEffect(() => {
    if (previousStreakRef.current !== null && streak > previousStreakRef.current) {
      setIsCelebrating(true);
      const timeoutId = window.setTimeout(() => {
        setIsCelebrating(false);
      }, 1200);

      previousStreakRef.current = streak;
      return () => window.clearTimeout(timeoutId);
    }

    previousStreakRef.current = streak;
    return undefined;
  }, [streak]);

  return isCelebrating;
}
