import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_shell/coach/$threadId")({
  head: () => ({
    meta: [
      { title: "Conversation — Coach IA Eclipse" },
      { name: "description", content: "Ta conversation avec le coach IA Eclipse." },
      { property: "og:title", content: "Conversation — Coach IA Eclipse" },
      { property: "og:description", content: "Ta conversation avec le coach IA Eclipse." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => null,
});
