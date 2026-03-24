import { createFileRoute, Link } from "@tanstack/react-router";
import { getCategoryPageData } from "@/server/queries";
import { UpdateList } from "@/components/update-list";
import { createSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/category/$categorySlug")({
  loader: async ({ params }) => {
    return getCategoryPageData({ data: params.categorySlug });
  },
  head: ({ loaderData, params }) => {
    const categoryName = loaderData?.category?.name ?? params.categorySlug;
    return createSeoHead({
      title: `${categoryName} AI News | AI Dose`,
      description: `Browse the latest ${categoryName} articles and AI updates on AI Dose.`,
      pathname: `/category/${params.categorySlug}`
    });
  },
  component: CategoryPage
});

function CategoryPage() {
  const loaderData = Route.useLoaderData();

  if (!loaderData.category) {
    return (
      <div className="container py-12 space-y-4">
        <h1 className="text-3xl font-heading font-bold tracking-tight">Category not found</h1>
        <p className="text-muted-foreground">This category archive does not exist yet.</p>
        <Link to="/" className="text-primary hover:underline">
          Back to homepage
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-12 space-y-8">
      <div className="space-y-4 border-b border-border/40 pb-6">
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary hover:underline">
            Home
          </Link>
          <span>/</span>
          <span className="text-foreground">{loaderData.category.name}</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-heading font-bold tracking-tight">{loaderData.category.name}</h1>
          <p className="text-lg text-muted-foreground">
            {loaderData.category.count} published articles in this category.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          {loaderData.categories.slice(0, 12).map((category) => (
            <Link
              key={category.slug}
              to="/category/$categorySlug"
              params={{ categorySlug: category.slug }}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${category.slug === loaderData.category?.slug ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground hover:border-primary/50 hover:text-primary"}`}
            >
              {category.name}
            </Link>
          ))}
        </div>
      </div>

      <UpdateList updates={loaderData.updates} listContext={`category:${loaderData.category.slug}`} />
    </div>
  );
}
