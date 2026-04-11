import { createFileRoute, Link } from "@tanstack/react-router";
import { StaticPageLayout } from "@/components/static-page-layout";
import { createSeoHead } from "@/lib/seo";
import { SITE_LAST_REVIEWED, SITE_TAGLINE } from "@/lib/site";

export const Route = createFileRoute("/about")({
  head: () =>
    createSeoHead({
      title: "About AI Dose",
      description:
        "Learn what AI Dose publishes, how coverage is selected, and how the site approaches daily AI reporting and long-form explainers.",
      pathname: "/about"
    }),
  component: AboutPage
});

function AboutPage() {
  return (
    <StaticPageLayout
      eyebrow="About"
      title="What AI Dose publishes and how it works"
      description={SITE_TAGLINE}
      lastReviewed={SITE_LAST_REVIEWED}
    >
      <p>
        AI Dose is an independent AI publication focused on daily updates, source-linked summaries,
        and longer explainers that help readers understand what matters in artificial intelligence.
      </p>
      <p>
        The site is built around two content types. Updates cover timely developments in research,
        products, policy, funding, and major launches. Articles go deeper into durable topics that
        benefit from context, structure, and revision over time.
      </p>
      <p>
        Coverage is selected for reader utility rather than volume. When original reporting,
        company announcements, research papers, or event pages are available, AI Dose links readers
        to those source materials directly.
      </p>
      <p>
        For standards, corrections, and disclosures, review the{" "}
        <Link to="/editorial-policy" className="font-medium text-primary hover:underline">
          Editorial Policy
        </Link>{" "}
        and{" "}
        <Link to="/disclaimer" className="font-medium text-primary hover:underline">
          Disclaimer
        </Link>
        . For direct questions about the publication, visit the{" "}
        <Link to="/contact" className="font-medium text-primary hover:underline">
          Contact
        </Link>{" "}
        page.
      </p>
    </StaticPageLayout>
  );
}
