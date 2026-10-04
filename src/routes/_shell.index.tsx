import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_shell/")({
  head: () => ({
    meta: [
      { title: "Eclipse — Focus & Personal Growth" },
      { name: "description", content: "A focused workspace for meaningful work, personal growth, and daily reflection." },
      { property: "og:title", content: "Eclipse — Focus & Personal Growth" },
      { property: "og:description", content: "A focused workspace for meaningful work, personal growth, and daily reflection." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => null,
});
