import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'
import { auth } from './server/auth'
import { db } from './server/db'
import { sql } from 'drizzle-orm'

const handler = createStartHandler(defaultStreamHandler)

export default {
    fetch: async (request: Request) => {
        try {
            const url = new URL(request.url)

            // Heartbeat for debugging
            if (url.pathname === '/api/heartbeat') {
                let db_status = 'unknown'
                try {
                    await db.execute(sql`SELECT 1`)
                    db_status = 'connected'
                } catch (e: any) {
                    db_status = `error: ${e.message}`
                }

                return new Response(JSON.stringify({
                    status: 'alive',
                    database: db_status,
                    timestamp: new Date().toISOString(),
                    env: {
                        has_db: !!process.env.DATABASE_URL,
                        has_secret: !!process.env.BETTER_AUTH_SECRET,
                        has_google: !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
                        app_url: process.env.VITE_APP_URL,
                    }
                }), { headers: { 'Content-Type': 'application/json' } })
            }

            if (url.pathname.startsWith('/api/auth')) {
                return await auth.handler(request)
            }

            const response = await handler(request)
            if (response.status === 500) {
                console.error(`🚩 SSR Handler returned 500 for ${url.pathname}`)
            }
            return response
        } catch (error: any) {
            console.error('🔥 CRITICAL SERVER ERROR:', error)
            return new Response(JSON.stringify({
                error: true,
                message: error.message || 'Unknown Error',
                stack: error.stack,
                url: request.url,
                phase: 'server_fetch'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            })
        }
    },
}
