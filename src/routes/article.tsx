import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/article")({
  component: ArticleLayout
});

function ArticleLayout() {
  return <Outlet />;
}
