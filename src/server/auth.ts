import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./schema";

if (!process.env.BETTER_AUTH_SECRET) {
    console.warn("⚠️ BETTER_AUTH_SECRET is not set. Better Auth may fail in production.");
}

const getBaseURL = () => {
    // SERVER_URL is a plain env var (not VITE_ prefixed), so it's available at server runtime
    if (process.env.SERVER_URL) return process.env.SERVER_URL;
    // VITE_APP_URL is only available at build time (injected by Vite), NOT at server runtime - do not use
    // VERCEL_URL is the deployment URL set by Vercel (no https:// prefix)
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return "http://localhost:3000";
};

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: schema,
    }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: getBaseURL(),
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        }
    }
});

