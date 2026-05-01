type UpdateContentInput = {
  title: string;
  summary: string;
  why_it_matters: string;
  content?: string | null;
  source_url?: string | null;
};

export type UpdateDetailSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets: string[];
};

export type UpdateDetailModel = {
  dek: string | null;
  keyTakeaways: string[];
  sections: UpdateDetailSection[];
  whyItMatters: string | null;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "section";
}

function normalizeWhitespace(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function cleanupBullet(value: string) {
  return value.replace(/^[-*•]\s+/, "").replace(/^\d+\.\s+/, "").trim();
}

function isHeadingLine(value: string) {
  const line = value.trim();
  if (!line) return false;
  if (/^#{1,6}\s+/.test(line)) return true;
  if (/^[A-Z][A-Za-z0-9/&(),:'"\- ]{2,60}:$/.test(line)) return true;
  return false;
}

function cleanHeading(value: string) {
  return value.replace(/^#{1,6}\s+/, "").replace(/:$/, "").trim();
}

function splitSentences(value: string) {
  return value
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function dedupe(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sameMeaning(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function normalizeOptionalText(value?: string | null) {
  if (!value) return null;
  const trimmed = normalizeWhitespace(value);
  if (!trimmed) return null;
  if (trimmed.toLowerCase() === "pending review") return null;
  return trimmed;
}

function parseSectionsFromContent(content: string) {
  const sections: UpdateDetailSection[] = [];
  const blocks = content.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  let untitledParagraphs: string[] = [];

  const flushUntitled = () => {
    if (!untitledParagraphs.length) return;
    const title = sections.length === 0 ? "What happened" : "More context";
    sections.push({
      id: slugify(title),
      title,
      paragraphs: untitledParagraphs,
      bullets: []
    });
    untitledParagraphs = [];
  };

  for (const block of blocks) {
    const lines = splitLines(block);
    if (!lines.length) continue;

    const firstLine = lines[0];
    if (isHeadingLine(firstLine)) {
      flushUntitled();
      const title = cleanHeading(firstLine);
      const remainingLines = lines.slice(1);
      const bullets = remainingLines
        .filter((line) => /^[-*•]\s+/.test(line) || /^\d+\.\s+/.test(line))
        .map(cleanupBullet);
      const paragraphLines = remainingLines.filter(
        (line) => !/^[-*•]\s+/.test(line) && !/^\d+\.\s+/.test(line)
      );

      sections.push({
        id: slugify(title),
        title,
        paragraphs: paragraphLines.length ? [paragraphLines.join(" ")] : [],
        bullets
      });
      continue;
    }

    const bullets = lines
      .filter((line) => /^[-*•]\s+/.test(line) || /^\d+\.\s+/.test(line))
      .map(cleanupBullet);

    if (bullets.length === lines.length && bullets.length > 0) {
      flushUntitled();
      const title = sections.length === 0 ? "Key details" : "Additional details";
      sections.push({
        id: slugify(title),
        title,
        paragraphs: [],
        bullets
      });
      continue;
    }

    untitledParagraphs.push(lines.join(" "));
  }

  flushUntitled();

  return sections;
}

export function buildUpdateDetailModel(input: UpdateContentInput): UpdateDetailModel {
  const summary = normalizeWhitespace(input.summary);
  const whyItMatters = normalizeOptionalText(input.why_it_matters);
  const rawContent = normalizeWhitespace(input.content ?? "");
  const hasContent = rawContent.length > 0 && !rawContent.startsWith("Source: http");
  const parsedSections = hasContent
    ? parseSectionsFromContent(rawContent)
        .map((section) => ({
          ...section,
          paragraphs: section.paragraphs.filter(
            (paragraph) => !sameMeaning(paragraph, summary) && (!whyItMatters || !sameMeaning(paragraph, whyItMatters))
          ),
          bullets: section.bullets.filter(
            (bullet) => !sameMeaning(bullet, summary) && (!whyItMatters || !sameMeaning(bullet, whyItMatters))
          )
        }))
        .filter((section) => section.paragraphs.length > 0 || section.bullets.length > 0)
    : [];

  const keyTakeaways = dedupe([
    splitSentences(summary)[0] ?? summary,
    ...(whyItMatters ? [whyItMatters] : []),
    ...parsedSections.flatMap((section) => section.bullets).slice(0, 2)
  ]).slice(0, 4);

  const sections =
    parsedSections.length > 0
      ? parsedSections
      : input.source_url
        ? [
            {
              id: "source-context",
              title: "Source and context",
              paragraphs: [
                `AI Dose linked the primary source for this update so readers can verify the original announcement, filing, post, or release notes directly.`
              ],
              bullets: []
            }
          ]
        : [];

  const dekCandidate = dedupe([
    ...parsedSections.flatMap((section) => [...section.paragraphs, ...section.bullets]).slice(0, 2),
    ...(whyItMatters ? [whyItMatters] : [])
  ]).find((item) => !sameMeaning(item, summary) && (!whyItMatters || !sameMeaning(item, whyItMatters)));
  const dek = dekCandidate ?? null;

  return {
    dek,
    keyTakeaways,
    sections,
    whyItMatters
  };
}
