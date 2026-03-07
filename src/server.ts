import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'
import { auth } from './server/auth'

const handler = createStartHandler(defaultStreamHandler)

export default {
    fetch: async (request: Request) => {
        try {
            const url = new URL(request.url)
            if (url.pathname.startsWith('/api/auth')) {
                return await auth.handler(request)
            }
            return await handler(request)
        } catch (error: any) {
            console.error('🔥 Server Error:', error)
            return new Response(JSON.stringify({
                error: true,
                message: error.message || 'Internal Server Error',
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            })
        }
    },
}
