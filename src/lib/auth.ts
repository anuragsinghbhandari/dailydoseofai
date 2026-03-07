import { createAuthClient } from "better-auth/react";

const getBaseURL = () => {
    // SERVER_URL works on both client and server (not VITE_ prefixed, so available in process.env on server)
    if (process.env.SERVER_URL) return process.env.SERVER_URL;
    // VERCEL_URL is auto-set by Vercel for the deployment URL (no https prefix)
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    // Localhost fallback
    return "https://www.dailydoseofai.tech";
};

export const authClient = createAuthClient({
    baseURL: getBaseURL()
});

export const { signIn, signOut, useSession } = authClient;
