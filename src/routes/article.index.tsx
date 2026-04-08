import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Clock3 } from "lucide-react";
import type { ArticleRecord } from "@/lib/articles";
import { absoluteUrl, createSeoHead } from "@/lib/seo";
import { formatLongUtcDate } from "@/lib/dates";
import { getPublishedArticles } from "@/server/articles";

function buildArticleCollectionSchema(articles: ArticleRecord[]) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "AI Dose Articles",
    description:
      "Detailed AI articles, conference guides, and selected long-form analysis published by AI Dose.",
    url: absoluteUrl("/article"),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: articles.map((article, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(`/article/${article.slug}`),
        name: article.title
      }))
    }
  };
}

export const Route = createFileRoute("/article/")({
  loader: async () => ({
    articles: await (getPublishedArticles as any)({})
  }),
  head: ({ loaderData }) => ({
    ...createSeoHead({
      title: "AI Articles and Long-Form AI Guides | AI Dose",
      description:
        "Browse detailed AI articles, conference guides, and selected long-form analysis from AI Dose.",
      pathname: "/article"
    }),
    scripts: loaderData?.articles?.length
      ? [
          {
            type: "application/ld+json",
            children: JSON.stringify(buildArticleCollectionSchema(loaderData.articles))
          }
        ]
      : []
  }),
  component: ArticlesIndexPage
});

function ArticlesIndexPage() {
  const { articles } = Route.useLoaderData();

  return (
    <div className="container py-12 md:py-16">
      <section className="relative overflow-hidden rounded-[2rem] border border-border/50 bg-[linear-gradient(180deg,rgba(255,251,245,0.98),rgba(246,238,228,0.95))] px-6 py-12 shadow-sm md:px-10 md:py-16 dark:bg-[linear-gradient(180deg,rgba(28,22,18,0.98),rgba(20,16,13,0.96))]">
        <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(124,89,64,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(124,89,64,0.08)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="relative max-w-3xl space-y-5">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">Article</p>
          <h1 className="text-4xl font-heading font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            Detailed AI guides built for search and serious readers
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
            This section collects longer, selected pieces that go deeper than the daily update feed.
            Each article is written for durable discovery, clean structure, and direct utility.
          </p>
        </div>
      </section>

      <section className="mt-10 grid gap-6">
        {articles.map((article) => (
          <article
            key={article.id}
            className="rounded-[1.75rem] border border-border/50 bg-card/80 p-6 shadow-sm backdrop-blur md:p-8"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
                  {article.category}
                </p>
                <h2 className="text-3xl font-heading font-bold tracking-tight">
                  <Link
                    to="/article/$slug"
                    params={{ slug: article.slug }}
                    className="transition-colors hover:text-primary"
                  >
                    {article.title}
                  </Link>
                </h2>
                <p className="text-base leading-7 text-muted-foreground">{article.excerpt}</p>
                <div className="flex flex-wrap gap-2">
                  {article.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/80 p-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span>{formatLongUtcDate(article.publishedAt)}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-primary" />
                  <span>{article.readingTimeMinutes} min read</span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
