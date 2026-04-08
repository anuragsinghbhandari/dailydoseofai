import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, Clock3 } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import type { ArticleRecord } from "@/lib/articles";
import { absoluteUrl, createSeoHead } from "@/lib/seo";
import { formatLongUtcDate } from "@/lib/dates";
import { getRecentPublishedUpdates } from "@/server/queries";
import { getArticleBySlug, getRelatedArticles } from "@/server/articles";

function buildBreadcrumbSchema(article: ArticleRecord) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: absoluteUrl("/")
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Article",
        item: absoluteUrl("/article")
      },
      {
        "@type": "ListItem",
        position: 3,
        name: article.title,
        item: absoluteUrl(`/article/${article.slug}`)
      }
    ]
  };
}

function buildEventSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: "IJCAI-ECAI 2026",
    startDate: "2026-08-15",
    endDate: "2026-08-21",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: "Bremen, Germany",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Bremen",
        addressCountry: "DE"
      }
    },
    description:
      "The 35th International Joint Conference on Artificial Intelligence, held jointly with the European Conference on Artificial Intelligence.",
    organizer: {
      "@type": "Organization",
      name: "IJCAI",
      url: "https://www.ijcai.org/"
    }
  };
}

export const Route = createFileRoute("/article/$slug")({
  loader: async ({ params }) => ({
    article: await (getArticleBySlug as any)({ data: params.slug }),
    relatedArticles: await (getRelatedArticles as any)({ data: { slug: params.slug, limit: 3 } }),
    latestUpdates: (await getRecentPublishedUpdates({ data: { limit: 4 } })).slice(0, 4)
  }),
  head: ({ params, loaderData }) => {
    const article = loaderData?.article;

    if (!article) {
      return createSeoHead({
        title: "Article Not Found | AI Dose",
        description: "The requested AI Dose article could not be found.",
        pathname: `/article/${params.slug}`,
        robots: "noindex, nofollow"
      });
    }

    return {
      ...createSeoHead({
        title: article.seoTitle,
        description: article.description,
        pathname: `/article/${article.slug}`,
        type: "article",
        publishedTime: article.publishedAt,
        modifiedTime: article.updatedAt
      }),
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: article.title,
            description: article.description,
            datePublished: article.publishedAt,
            dateModified: article.updatedAt,
            mainEntityOfPage: absoluteUrl(`/article/${article.slug}`),
            articleSection: article.category,
            keywords: article.keywords.join(", "),
            url: absoluteUrl(`/article/${article.slug}`),
            author: {
              "@type": "Organization",
              name: "AI Dose"
            },
            publisher: {
              "@type": "Organization",
              name: "AI Dose",
              url: absoluteUrl("/")
            },
            isAccessibleForFree: true
          })
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(buildBreadcrumbSchema(article))
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(buildEventSchema())
        }
      ]
    };
  },
  component: ArticleDetailPage
});

function ArticleDetailPage() {
  const { article, relatedArticles, latestUpdates } = Route.useLoaderData();

  if (!article) {
    return (
      <div className="container py-12">
        <p className="text-sm text-muted-foreground">Article not found.</p>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8 md:py-12">
      <div className="mb-8 space-y-6">
        <Link
          to="/article"
          className="inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to articles
        </Link>

        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/article">Article</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{article.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="min-w-0">
          <header className="relative overflow-hidden rounded-[2rem] border border-border/50 bg-[linear-gradient(180deg,rgba(255,251,245,0.98),rgba(247,239,229,0.95))] p-6 shadow-sm md:p-10 dark:bg-[linear-gradient(180deg,rgba(28,22,18,0.98),rgba(20,16,13,0.96))]">
            <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(124,89,64,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(124,89,64,0.08)_1px,transparent_1px)] [background-size:42px_42px]" />
            <div className="relative space-y-5">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/85">
                {article.category}
              </p>
              <h1 className="max-w-4xl text-4xl font-heading font-extrabold tracking-tight sm:text-5xl md:text-6xl leading-[1.08]">
                {article.title}
              </h1>
              <p className="max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
                {article.excerpt}
              </p>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span>{formatLongUtcDate(article.publishedAt)}</span>
                </div>
                <div className="inline-flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-primary" />
                  <span>{article.readingTimeMinutes} min read</span>
                </div>
              </div>
            </div>
          </header>

          <div className="mt-8 rounded-[1.75rem] border border-border/50 bg-card/80 p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-heading font-bold tracking-tight">Table of Contents</h2>
            <ol className="mt-5 space-y-3">
              {article.tableOfContents.map((item, index) => (
                <li key={item.id} className="flex gap-3">
                  <span className="pt-0.5 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <a href={`#${item.id}`} className="font-medium text-foreground transition-colors hover:text-primary">
                    {item.label}
                  </a>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-8 space-y-8">
            {article.sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-24 rounded-[1.75rem] border border-border/50 bg-card/80 p-6 shadow-sm md:p-8"
              >
                <h2 className="text-2xl font-heading font-bold tracking-tight">{section.title}</h2>
                <div className="mt-5 space-y-4 text-base leading-8 text-muted-foreground">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                {section.bullets && section.bullets.length > 0 ? (
                  <ul className="mt-6 space-y-3 text-base leading-7 text-muted-foreground">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3">
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </article>

        <aside className="space-y-6">
          <div className="rounded-[1.75rem] border border-border/50 bg-card/80 p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              More articles
            </h2>
            <div className="mt-4 space-y-4">
              {relatedArticles.length > 0 ? (
                relatedArticles.map((relatedArticle) => (
                  <div key={relatedArticle.id} className="border-b border-border/40 pb-4 last:border-b-0 last:pb-0">
                    <Link
                      to="/article/$slug"
                      params={{ slug: relatedArticle.slug }}
                      className="font-medium text-foreground transition-colors hover:text-primary"
                    >
                      {relatedArticle.title}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatLongUtcDate(relatedArticle.publishedAt)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  More detailed guides will appear here as the article section grows.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-border/50 bg-card/80 p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Latest updates
            </h2>
            <div className="mt-4 space-y-4">
              {latestUpdates.map((update) => (
                <div key={update.id} className="border-b border-border/40 pb-4 last:border-b-0 last:pb-0">
                  <Link
                    to="/update/$slug"
                    params={{ slug: update.slug }}
                    className="font-medium text-foreground transition-colors hover:text-primary"
                  >
                    {update.title}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatLongUtcDate(update.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
