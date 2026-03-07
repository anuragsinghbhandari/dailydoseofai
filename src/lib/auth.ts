import { createAuthClient } from "better-auth/react";

const getBaseURL = () => {
    // Priority 1: VITE_APP_URL from env
    if (process.env.VITE_APP_URL) return process.env.VITE_APP_URL;
    // Priority 2: VERCEL_URL fallback
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    // Localhost fallback
    return "http://localhost:3000";
};

export const authClient = createAuthClient({
    baseURL: getBaseURL()
});

export const { signIn, signOut, useSession } = authClient;
