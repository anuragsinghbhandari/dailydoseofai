import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "./auth";
import { getNormalizedUserStreak } from "./streak";

export interface ViewerState {
    session: Awaited<ReturnType<typeof auth.api.getSession>>;
    streak: number;
    lastActiveDate: Date | null;
}

export const getServerSession = createServerFn({ method: "GET" }).handler(
    async () => {
        try {
            const req = getRequest();
            if (!req) return null;
            return await auth.api.getSession({ headers: req.headers });
        } catch (error) {
            console.error("❌ getServerSession failed:", error);
            return null;
        }
    }
);

export const getViewerState = createServerFn({ method: "GET" }).handler(
    async (): Promise<ViewerState | null> => {
        try {
            const req = getRequest();
            if (!req) return null;

            const session = await auth.api.getSession({ headers: req.headers });
            if (!session) return null;

            const streakState = await getNormalizedUserStreak(session.user.id);

            return {
                session,
                streak: streakState.streak,
                lastActiveDate: streakState.lastActiveDate,
            };
        } catch (error) {
            console.error("❌ getViewerState failed:", error);
            return null;
        }
    }
);
