import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'
import { auth } from './server/auth'

const handler = createStartHandler(defaultStreamHandler)

export default {
    fetch: async (request: Request) => {
        const url = new URL(request.url)
        if (url.pathname.startsWith('/api/auth')) {
            return auth.handler(request)
        }
        return handler(request)
    },
}
