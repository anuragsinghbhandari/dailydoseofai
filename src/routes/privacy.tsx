import { createFileRoute } from "@tanstack/react-router";
import { StaticPageLayout } from "@/components/static-page-layout";
import { createSeoHead } from "@/lib/seo";
import { SITE_LAST_REVIEWED } from "@/lib/site";

export const Route = createFileRoute("/privacy")({
  head: () =>
    createSeoHead({
      title: "Privacy Policy | AI Dose",
      description:
        "Review how AI Dose handles analytics, authentication data, and basic site usage information.",
      pathname: "/privacy"
    }),
  component: PrivacyPage
});

function PrivacyPage() {
  return (
    <StaticPageLayout
      eyebrow="Privacy"
      title="Privacy Policy"
      description="This page explains what data AI Dose collects, why it is collected, and how it is used."
      lastReviewed={SITE_LAST_REVIEWED}
    >
      <p>
        AI Dose collects limited technical and account data needed to operate the website,
        understand site usage, and support optional account features such as bookmarks,
        comments, and reading streaks.
      </p>
      <h2>Information the site may collect</h2>
      <p>
        This may include basic analytics events, page views, referral information, browser and
        device information, authentication details needed to sign users in, and data voluntarily
        submitted through account or comment features.
      </p>
      <h2>How information is used</h2>
      <p>
        Information is used to operate the website, improve performance, measure content usage,
        maintain security, prevent abuse, and support user-facing features. AI Dose does not sell
        personal information as part of normal site operations.
      </p>
      <h2>Cookies and analytics</h2>
      <p>
        The site uses cookies or similar technologies where needed for sign-in state, analytics,
        and core product behavior. Third-party services may process data according to their own
        policies when those services are used.
      </p>
      <h2>Retention and requests</h2>
      <p>
        Data is retained only as long as reasonably necessary for site operations, legal
        obligations, security, and record-keeping. Use the contact page for privacy-related
        questions or requests.
      </p>
    </StaticPageLayout>
  );
}
