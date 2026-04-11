import { createFileRoute } from "@tanstack/react-router";
import { StaticPageLayout } from "@/components/static-page-layout";
import { createSeoHead } from "@/lib/seo";
import { SITE_LAST_REVIEWED, getContactEmail } from "@/lib/site";

export const Route = createFileRoute("/contact")({
  loader: async () => ({
    contactEmail: getContactEmail()
  }),
  head: () =>
    createSeoHead({
      title: "Contact AI Dose",
      description:
        "Contact the AI Dose publisher for corrections, policy questions, business inquiries, and feedback.",
      pathname: "/contact"
    }),
  component: ContactPage
});

function ContactPage() {
  const { contactEmail } = Route.useLoaderData();

  return (
    <StaticPageLayout
      eyebrow="Contact"
      title="Reach the publisher"
      description="Use this page for corrections, policy questions, business inquiries, or general feedback."
      lastReviewed={SITE_LAST_REVIEWED}
    >
      {contactEmail ? (
        <p>
          Email:{" "}
          <a href={`mailto:${contactEmail}`} className="font-medium text-primary hover:underline">
            {contactEmail}
          </a>
        </p>
      ) : (
        <p>
          A monitored contact email has not been configured for this deployment yet. Before applying
          for AdSense, publish a real editorial contact address by setting the `CONTACT_EMAIL`
          environment variable.
        </p>
      )}
      <p>
        Correction requests should include the page URL, the specific claim in question, and the
        evidence supporting the requested change. Clear requests are easier to verify and resolve.
      </p>
      <p>
        Business and policy inquiries should identify the requesting organization, the purpose of
        the inquiry, and any required deadlines.
      </p>
    </StaticPageLayout>
  );
}
