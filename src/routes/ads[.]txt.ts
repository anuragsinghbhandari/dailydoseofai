import { createFileRoute } from "@tanstack/react-router";
import { ADSENSE_PUBLISHER_LINE } from "@/lib/site";

export const Route = createFileRoute("/ads.txt")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(ADSENSE_PUBLISHER_LINE, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600"
          }
        });
      }
    }
  }
});
