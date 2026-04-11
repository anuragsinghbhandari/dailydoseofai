import { createFileRoute } from "@tanstack/react-router";
import { StaticPageLayout } from "@/components/static-page-layout";
import { createSeoHead } from "@/lib/seo";
import { SITE_LAST_REVIEWED } from "@/lib/site";

export const Route = createFileRoute("/disclaimer")({
  head: () =>
    createSeoHead({
      title: "Disclaimer | AI Dose",
      description:
        "Read the AI Dose disclaimer covering informational use, external links, and non-advisory content.",
      pathname: "/disclaimer"
    }),
  component: DisclaimerPage
});

function DisclaimerPage() {
  return (
    <StaticPageLayout
      eyebrow="Disclaimer"
      title="Content Disclaimer"
      description="AI Dose publishes informational content and does not provide legal, financial, or investment advice."
      lastReviewed={SITE_LAST_REVIEWED}
    >
      <p>
        AI Dose content is published for informational and educational purposes. It should not be
        treated as legal advice, investment advice, procurement advice, or any other form of
        professional counsel.
      </p>
      <p>
        Coverage may discuss third-party companies, products, models, and research. Mentions or
        links do not imply endorsement. Readers should evaluate original sources and make their own
        decisions.
      </p>
      <p>
        AI and technology information can change quickly. Even when content is updated, there may be
        delays between new developments and on-site revisions.
      </p>
    </StaticPageLayout>
  );
}
