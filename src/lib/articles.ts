export type ArticleTableOfContentsItem = {
  id: string;
  label: string;
};

export type ArticleSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type ArticleRecord = {
  id: string;
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  excerpt: string;
  publishedAt: string;
  updatedAt: string;
  readingTimeMinutes: number;
  category: string;
  keywords: string[];
  tableOfContents: ArticleTableOfContentsItem[];
  sections: ArticleSection[];
  featured: boolean;
};

export type ArticlePersistenceShape = {
  id?: string;
  slug: string;
  title: string;
  seo_title: string;
  description: string;
  excerpt: string;
  published_at: string | Date;
  updated_at: string | Date;
  reading_time_minutes: number;
  category: string;
  keywords: string;
  table_of_contents: string;
  sections: string;
  featured?: boolean;
  published?: boolean;
};

export const seededArticles: ArticleRecord[] = [
  {
    id: "ijcai-ecai-2026-guide",
    slug: "ijcai-ecai-2026-bremen-guide",
    title: "The Ultimate Guide to IJCAI-ECAI 2026: Bremen's Premier AI Conference",
    seoTitle: "Ultimate Guide to IJCAI-ECAI 2026 in Bremen | AI Dose",
    description:
      "A detailed IJCAI-ECAI 2026 guide covering key themes, the April 29 notification milestone, Bremen travel logistics, and why the conference matters beyond attendees.",
    excerpt:
      "Everything worth tracking about IJCAI-ECAI 2026, from the April 29 notification date to Bremen travel planning and the open-access research pipeline.",
    publishedAt: "2026-04-08T00:00:00.000Z",
    updatedAt: "2026-04-08T00:00:00.000Z",
    readingTimeMinutes: 8,
    category: "Conference Guide",
    featured: true,
    keywords: [
      "IJCAI 2026",
      "ECAI 2026",
      "Bremen AI conference",
      "AI research conference",
      "AI conference travel"
    ],
    tableOfContents: [
      { id: "introduction", label: "Introduction: The Convergence of Global AI" },
      { id: "themes", label: "Key Themes and What to Expect at IJCAI 2026" },
      { id: "dates", label: "Important Dates and the April 29 Milestone" },
      { id: "travel", label: "Travel and Logistics: Getting to Bremen" },
      { id: "why-it-matters", label: "Why You Should Care, Even if You Aren't Attending" }
    ],
    sections: [
      {
        id: "introduction",
        title: "Introduction: The Convergence of Global AI",
        paragraphs: [
          "Artificial intelligence is moving at unusual speed, and in 2026 one of the biggest focal points is Germany. The 35th International Joint Conference on Artificial Intelligence, IJCAI 2026, is joining forces with the European Conference on Artificial Intelligence, ECAI, to create one of the most important AI gatherings of the year.",
          "The conference is scheduled for August 15 to August 21, 2026, in Bremen, Germany. IJCAI-ECAI 2026 is not just another research meetup. It is positioned as the world's oldest and most comprehensive AI conference, and it stands out as a major Bremen AI conference for researchers, engineers, founders, and students tracking the next wave of machine intelligence.",
          "With Professor Diego Calvanese serving as Program Chair, the event is expected to connect foundational research, including machine learning architectures and large language model optimization, with broader questions about deployment, governance, and social impact. Whether you are waiting for a paper decision, scouting the next breakthrough, or tracking the direction of the field, this is the conference to watch."
        ]
      },
      {
        id: "themes",
        title: "Key Themes and What to Expect at IJCAI 2026",
        paragraphs: [
          "The main program will span the full AI landscape, from computer vision to natural language processing, but several specialized tracks make IJCAI-ECAI 2026 especially relevant for researchers, builders, and policy watchers. As an AI research conference, it signals where AI is going next, not only what models can do, but also how those capabilities should be applied."
        ],
        bullets: [
          "Human-Centred Artificial Intelligence (HAI): This track focuses on the multidisciplinary challenges of deploying AI in real-world settings, with attention on ethics, fairness, transparency, and systems that augment human decision-making.",
          "AI and Social Good: This initiative highlights AI work aligned with the UN Sustainable Development Goals, including climate modeling, healthcare access, and democratic resilience.",
          "Demonstrations Track: This is where theory meets execution. Expect interactive systems, practical applications, and working AI prototypes that show how research translates into usable tools.",
          "Survey Track: For anyone trying to understand fast-moving subfields, the survey sessions offer synthesized overviews and expert-led literature reviews that compress months of reading into one track."
        ]
      },
      {
        id: "dates",
        title: "Important Dates and the April 29 Milestone",
        paragraphs: [
          "For researchers and students who submitted papers in January and February, the most important near-term date is April 29, 2026. That is the notification day for the Human-Centred AI track, the AI and Social Good track, the Survey track, and the Demonstrations track.",
          "This date matters beyond the authors themselves. Historically, acceptance notifications trigger a visible wave of activity across the broader AI community. In late April and early May, accepted work often begins appearing as preprints on arXiv, code releases on GitHub, and discussion threads across research and developer circles.",
          "If you want to spot emerging ideas early, this is the window to watch. Notification day is effectively the start of the conference's public discovery cycle."
        ]
      },
      {
        id: "travel",
        title: "Travel and Logistics: Getting to Bremen",
        paragraphs: [
          "Anyone planning to attend should start thinking about travel as soon as decisions are released. Bremen is a historic northern German city with solid transport links, but international travel planning still rewards early action, especially in peak summer season. For anyone searching for practical Bremen AI conference logistics, this is the planning layer that matters most after acceptance."
        ],
        bullets: [
          "Getting there: Bremen Airport (BRE) connects through major European hubs. Many travelers also arrive via Frankfurt (FRA) or Amsterdam (AMS) and continue to Bremen by ICE or other rail connections.",
          "Visa planning: For international researchers traveling from hubs such as Silicon Valley, London, or the Delhi NCR region, Schengen visa planning should begin immediately after April 29. Appointment times can tighten quickly as summer approaches.",
          "Accommodation: Hotels and short-term rentals near Bremen Hauptbahnhof or the Burgerpark area can simplify access to the conference venues and daily transit."
        ]
      },
      {
        id: "why-it-matters",
        title: "Why You Should Care, Even if You Aren't Attending",
        paragraphs: [
          "You do not need a flight to Germany to benefit from IJCAI-ECAI 2026. One of the strongest reasons to follow the conference is its commitment to open science. Accepted papers are published by IJCAI as open access, which means the broader community can study the year's most important ideas without paywalls.",
          "By the time the conference closes on August 21, 2026, developers will have a fresh pool of algorithms, methods, and benchmarks to test. Founders can use the proceedings as an early signal for the technical landscape over the next 12 to 18 months. Students and independent builders can treat the conference archive as a high-quality learning roadmap.",
          "If you build products, evaluate tooling, or follow AI research for strategic reasons, IJCAI-ECAI 2026 is not just an event. It is a compressed preview of where the field is heading next."
        ]
      }
    ]
  }
];

function parseJsonValue<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function serializeArticleKeywords(value: string[]) {
  return JSON.stringify(value);
}

export function serializeArticleTableOfContents(value: ArticleTableOfContentsItem[]) {
  return JSON.stringify(value);
}

export function serializeArticleSections(value: ArticleSection[]) {
  return JSON.stringify(value);
}

export function hydrateArticleRecord(row: ArticlePersistenceShape): ArticleRecord {
  return {
    id: row.id ?? row.slug,
    slug: row.slug,
    title: row.title,
    seoTitle: row.seo_title,
    description: row.description,
    excerpt: row.excerpt,
    publishedAt: new Date(row.published_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    readingTimeMinutes: row.reading_time_minutes,
    category: row.category,
    featured: row.featured ?? false,
    keywords: parseJsonValue<string[]>(row.keywords, []),
    tableOfContents: parseJsonValue<ArticleTableOfContentsItem[]>(row.table_of_contents, []),
    sections: parseJsonValue<ArticleSection[]>(row.sections, [])
  };
}

export function toArticlePersistenceShape(article: ArticleRecord): ArticlePersistenceShape {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    seo_title: article.seoTitle,
    description: article.description,
    excerpt: article.excerpt,
    published_at: article.publishedAt,
    updated_at: article.updatedAt,
    reading_time_minutes: article.readingTimeMinutes,
    category: article.category,
    featured: article.featured,
    published: true,
    keywords: serializeArticleKeywords(article.keywords),
    table_of_contents: serializeArticleTableOfContents(article.tableOfContents),
    sections: serializeArticleSections(article.sections)
  };
}
