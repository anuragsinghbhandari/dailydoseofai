import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { getAllArticles, updateArticle, type NewArticle } from "@/server/articles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

function isValidJson(value: string) {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

const formSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(3),
  seo_title: z.string().min(3),
  description: z.string().min(20),
  excerpt: z.string().min(20),
  category: z.string().min(2),
  reading_time_minutes: z.coerce.number().min(1).max(60),
  keywords: z.string().refine(isValidJson, "Use a JSON array of strings"),
  table_of_contents: z.string().refine(isValidJson, "Use a JSON array of { id, label } objects"),
  sections: z.string().refine(isValidJson, "Use a JSON array of section objects"),
  published_at: z.string().min(10),
  featured: z.boolean(),
  published: z.boolean()
});

type FormValues = z.infer<typeof formSchema>;

export const Route = createFileRoute("/admin/edit-article/$id")({
  component: EditArticlePage
});

function EditArticlePage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const listQuery = useQuery({
    queryKey: ["admin", "articles"],
    queryFn: () => getAllArticles()
  });

  const existing = listQuery.data?.find((article) => article.id === id);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    values: existing
      ? {
          title: existing.title,
          slug: existing.slug,
          seo_title: existing.seo_title,
          description: existing.description,
          excerpt: existing.excerpt,
          category: existing.category,
          reading_time_minutes: existing.reading_time_minutes,
          keywords: existing.keywords,
          table_of_contents: existing.table_of_contents,
          sections: existing.sections,
          published_at: new Date(existing.published_at).toISOString(),
          featured: existing.featured,
          published: existing.published
        }
      : undefined
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      (updateArticle as any)({
        data: {
          id,
          data: {
            ...values,
            updated_at: new Date()
          } satisfies Partial<NewArticle>
        }
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "articles"] });
      toast({
        title: "Success",
        description: "The article was modified successfully."
      });
      router.navigate({ to: "/admin/dashboard" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to modify the article. Please try again.",
        variant: "destructive"
      });
    }
  });

  if (listQuery.isLoading || !existing) {
    return (
      <div className="container max-w-5xl space-y-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-[640px] w-full" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl space-y-8 py-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/admin/dashboard">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit article</h1>
          <p className="text-sm text-muted-foreground">
            Update structured content, metadata, or publishing state for this article.
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((values) => mutation.mutate(values) as any)} className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Core content</CardTitle>
                  <CardDescription>Main metadata used on the article page and in search snippets.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    ["title", "Title"],
                    ["slug", "Slug"],
                    ["seo_title", "SEO title"],
                    ["category", "Category"],
                    ["published_at", "Published at (ISO)"]
                  ].map(([name, label]) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name as keyof FormValues}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{label}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea rows={4} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="excerpt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Excerpt</FormLabel>
                        <FormControl>
                          <Textarea rows={4} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Structured body</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    ["keywords", "Keywords JSON", 6],
                    ["table_of_contents", "Table of contents JSON", 8],
                    ["sections", "Sections JSON", 16]
                  ].map(([name, label, rows]) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name as keyof FormValues}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{label}</FormLabel>
                          <FormControl>
                            <Textarea rows={rows as number} {...field} />
                          </FormControl>
                          {name === "sections" ? (
                            <FormDescription>
                              Each section should have `id`, `title`, `paragraphs`, and optional `bullets`.
                            </FormDescription>
                          ) : null}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Publishing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="reading_time_minutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reading time</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={60} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="published"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <FormLabel>Published</FormLabel>
                          <FormDescription>Allow the article to appear publicly.</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="featured"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <FormLabel>Featured</FormLabel>
                          <FormDescription>Promote this article on home and footer slots.</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Save article"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
