import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "./auth";

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
