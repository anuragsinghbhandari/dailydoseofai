import { absoluteUrl, DEFAULT_DESCRIPTION, SITE_NAME } from "./seo";

export const SITE_TAGLINE = "Daily AI news, explainers, and source-linked reporting.";
export const SITE_PUBLISHER_NAME = SITE_NAME;
export const SITE_LAST_REVIEWED = "April 11, 2026";
export const SITE_CONTACT_EMAIL = "anuragbhandari.dev@gmail.com";
export const ADSENSE_PUBLISHER_LINE =
  "google.com, pub-8862669630969242, DIRECT, f08c47fec0942fa0";

export function getContactEmail() {
  return SITE_CONTACT_EMAIL;
}

export function buildOrganizationSchema() {
  const contactEmail = getContactEmail();
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_PUBLISHER_NAME,
    url: absoluteUrl("/"),
    description: DEFAULT_DESCRIPTION
  };

  if (contactEmail) {
    schema.email = contactEmail;
    schema.contactPoint = [
      {
        "@type": "ContactPoint",
        contactType: "editorial",
        email: contactEmail,
        url: absoluteUrl("/contact")
      }
    ];
  }

  return schema;
}

export function buildWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    description: DEFAULT_DESCRIPTION,
    publisher: {
      "@type": "Organization",
      name: SITE_PUBLISHER_NAME,
      url: absoluteUrl("/")
    }
  };
}
