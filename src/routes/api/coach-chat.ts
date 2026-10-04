import { createFileRoute } from "@tanstack/react-router";
import { handleCoachChat } from "@/lib/coach/coach-chat.server";

export const Route = createFileRoute("/api/coach-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          return await handleCoachChat(request);
        } catch (error) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          throw error;
        }
      },
    },
  },
});
