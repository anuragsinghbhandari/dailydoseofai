import type { ReactNode } from "react";

type StaticPageLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  lastReviewed?: string;
  children: ReactNode;
};

export function StaticPageLayout({
  eyebrow,
  title,
  description,
  lastReviewed,
  children
}: StaticPageLayoutProps) {
  return (
    <div className="container py-12 md:py-16">
      <section className="relative overflow-hidden rounded-[2rem] border border-border/50 bg-[linear-gradient(180deg,rgba(255,251,245,0.98),rgba(246,238,228,0.95))] px-6 py-12 shadow-sm md:px-10 md:py-16 dark:bg-[linear-gradient(180deg,rgba(28,22,18,0.98),rgba(20,16,13,0.96))]">
        <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(124,89,64,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(124,89,64,0.08)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="relative max-w-3xl space-y-5">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">{eyebrow}</p>
          <h1 className="text-4xl font-heading font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            {title}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">{description}</p>
          {lastReviewed ? (
            <p className="text-sm font-medium text-muted-foreground">Last reviewed: {lastReviewed}</p>
          ) : null}
        </div>
      </section>

      <section className="mt-10 rounded-[1.75rem] border border-border/50 bg-card/80 p-6 shadow-sm backdrop-blur md:p-8">
        <div className="prose prose-neutral max-w-4xl text-base leading-7 text-muted-foreground dark:prose-invert">
          {children}
        </div>
      </section>
    </div>
  );
}
