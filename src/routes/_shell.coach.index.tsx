import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_shell/coach/")({
  head: () => ({
    meta: [
      { title: "Coach IA — Eclipse" },
      { name: "description", content: "Discute avec ton coach IA personnel : force, nutrition, récupération et productivité." },
      { property: "og:title", content: "Coach IA — Eclipse" },
      { property: "og:description", content: "Discute avec ton coach IA personnel : force, nutrition, récupération et productivité." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => null,
});
