import { createFileRoute } from "@tanstack/react-router";
import { StaticPageLayout } from "@/components/static-page-layout";
import { createSeoHead } from "@/lib/seo";
import { SITE_LAST_REVIEWED } from "@/lib/site";

export const Route = createFileRoute("/terms")({
  head: () =>
    createSeoHead({
      title: "Terms of Use | AI Dose",
      description:
        "Review the basic terms that govern use of the AI Dose website and its editorial content.",
      pathname: "/terms"
    }),
  component: TermsPage
});

function TermsPage() {
  return (
    <StaticPageLayout
      eyebrow="Terms"
      title="Terms of Use"
      description="By using AI Dose, you agree to the basic rules described on this page."
      lastReviewed={SITE_LAST_REVIEWED}
    >
      <p>
        AI Dose is provided for lawful informational use. You agree not to misuse the website,
        interfere with its operation, attempt unauthorized access, or post unlawful, abusive, or
        misleading material through interactive features.
      </p>
      <p>
        Unless otherwise stated, the site design, branding, original editorial copy, and published
        materials are owned by or licensed to AI Dose. Limited quotation and linking are permitted
        with proper attribution.
      </p>
      <p>
        External links are provided for reader convenience. AI Dose is not responsible for the
        availability, accuracy, or practices of third-party sites.
      </p>
      <p>
        The site may update or remove content, change product features, or revise these terms at
        any time. Continued use of the website after changes are published constitutes acceptance of
        the revised terms.
      </p>
    </StaticPageLayout>
  );
}
