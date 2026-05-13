import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getTodayUpdates } from "@/server/queries";
import { UpdateList } from "@/components/update-list";
import { absoluteUrl, createSeoHead, truncateDescription } from "@/lib/seo";
import { formatLongUtcDate, getCurrentUtcDate } from "@/lib/dates";

const TODAY_SEO_TITLE = "Today's AI News | Daily AI Updates | AI Dose";
const TODAY_SEO_DESCRIPTION =
  "Read today's AI news updates with quick summaries, source links, and analysis of AI launches, research, tools, policy, and business moves.";

type TodayStructuredUpdate = {
  title: string;
  slug: string;
  summary?: string;
  category?: string;
  created_at?: Date | string;
};

function toIsoDate(value?: Date | string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function buildTodayCollectionSchema(updates: TodayStructuredUpdate[]) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${absoluteUrl("/today")}#todays-ai-news`,
    name: "Today's AI News",
    alternateName: ["AI News Today", "Daily AI Updates"],
    description: TODAY_SEO_DESCRIPTION,
    url: absoluteUrl("/today"),
    inLanguage: "en",
    isAccessibleForFree: true,
    dateModified: toIsoDate(updates[0]?.created_at),
    publisher: {
      "@type": "Organization",
      name: "AI Dose",
      url: absoluteUrl("/")
    },
    mainEntity: {
      "@type": "ItemList",
      name: "Today's AI news updates",
      itemListElement: updates.slice(0, 20).map((update, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "NewsArticle",
          headline: update.title,
          description: update.summary ? truncateDescription(update.summary, 180) : undefined,
          articleSection: update.category,
          datePublished: toIsoDate(update.created_at),
          dateModified: toIsoDate(update.created_at),
          url: absoluteUrl(`/update/${update.slug}`),
          mainEntityOfPage: absoluteUrl(`/update/${update.slug}`)
        }
      }))
    }
  };
}

export const Route = createFileRoute("/today")({
  head: ({ loaderData }) => ({
    ...createSeoHead({
      title: TODAY_SEO_TITLE,
      description: TODAY_SEO_DESCRIPTION,
      pathname: "/today"
    }),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(buildTodayCollectionSchema(loaderData?.today ?? []))
      }
    ]
  }),
  component: TodayPage,
  loader: async () => {
    const today = await getTodayUpdates();
    return { today };
  }
});

function TodayPage() {
  const loaderData = Route.useLoaderData();
  const displayDate = formatLongUtcDate(getCurrentUtcDate());
  const latestUpdateDate = loaderData.today[0]?.created_at
    ? formatLongUtcDate(loaderData.today[0].created_at)
    : null;

  const query = useQuery({
    queryKey: ["updates", "today"],
    queryFn: () => getTodayUpdates(),
    initialData: loaderData.today,
    staleTime: 5 * 60 * 1000
  });

  return (
    <div className="container space-y-8 py-8">
      <header className="max-w-4xl space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/80">
          AI news today
        </p>
        <h1 className="text-3xl font-heading font-bold tracking-tight md:text-5xl">
          Today's AI news for {displayDate}
        </h1>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
          Start with the short summary on each card, then open any update for deeper context,
          source links, and structured analysis of AI launches, research, tools, policy, and
          business moves.
        </p>
        {latestUpdateDate ? (
          <p className="text-sm font-medium text-foreground">
            Latest selected update: {latestUpdateDate}.
          </p>
        ) : null}
      </header>
      <UpdateList
        updates={query.data ?? []}
        isLoading={query.isLoading}
      />
    </div>
  );
}
