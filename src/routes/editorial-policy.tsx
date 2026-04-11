import { createFileRoute } from "@tanstack/react-router";
import { StaticPageLayout } from "@/components/static-page-layout";
import { createSeoHead } from "@/lib/seo";
import { SITE_LAST_REVIEWED } from "@/lib/site";

export const Route = createFileRoute("/editorial-policy")({
  head: () =>
    createSeoHead({
      title: "Editorial Policy | AI Dose",
      description:
        "Read how AI Dose selects stories, uses sources, handles corrections, and separates editorial judgment from monetization.",
      pathname: "/editorial-policy"
    }),
  component: EditorialPolicyPage
});

function EditorialPolicyPage() {
  return (
    <StaticPageLayout
      eyebrow="Editorial"
      title="Editorial Policy"
      description="These standards describe how AI Dose selects, summarizes, and updates coverage."
      lastReviewed={SITE_LAST_REVIEWED}
    >
      <h2>Selection and sourcing</h2>
      <p>
        AI Dose prioritizes original source material whenever it is available, including research
        papers, official announcements, conference pages, product documentation, and direct company
        statements. Secondary reporting may be used for context, but source links are preferred.
      </p>
      <h2>Summaries and explainers</h2>
      <p>
        Update pages summarize notable developments and explain why they matter for readers. Article
        pages provide additional context and are intended to be original editorial work rather than
        scraped or republished copy.
      </p>
      <h2>Corrections and updates</h2>
      <p>
        If a material factual error is confirmed, AI Dose will revise the affected page. Readers can
        submit correction requests through the contact page.
      </p>
      <h2>Advertising and independence</h2>
      <p>
        Editorial decisions are made independently of advertising relationships. Sponsored or paid
        material, if ever published, should be clearly labeled so that readers can distinguish it
        from editorial content.
      </p>
    </StaticPageLayout>
  );
}
