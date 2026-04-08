import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { createArticle, type NewArticle } from "@/server/articles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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

const DEFAULT_TABLE_OF_CONTENTS = JSON.stringify(
  [{ id: "section-id", label: "Section title" }],
  null,
  2
);

const DEFAULT_SECTIONS = JSON.stringify(
  [
    {
      id: "section-id",
      title: "Section title",
      paragraphs: ["Paragraph one"],
      bullets: ["Optional bullet"]
    }
  ],
  null,
  2
);

export const Route = createFileRoute("/admin/create-article")({
  component: CreateArticlePage
});

function CreateArticlePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      title: "",
      slug: "",
      seo_title: "",
      description: "",
      excerpt: "",
      category: "",
      reading_time_minutes: 8,
      keywords: JSON.stringify(["keyword one", "keyword two"], null, 2),
      table_of_contents: DEFAULT_TABLE_OF_CONTENTS,
      sections: DEFAULT_SECTIONS,
      published_at: new Date().toISOString(),
      featured: false,
      published: false
    }
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      (createArticle as any)({
        data: {
          ...values,
          updated_at: new Date(values.published_at)
        } satisfies NewArticle
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "articles"] });
      toast({
        title: "Success",
        description: "The article was created successfully."
      });
      router.navigate({ to: "/admin/dashboard" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create the article. Please try again.",
        variant: "destructive"
      });
    }
  });

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
          <h1 className="text-3xl font-bold tracking-tight">Create article</h1>
          <p className="text-sm text-muted-foreground">
            Add a long-form article with structured sections for the article hub.
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
                  <CardDescription>
                    Main metadata used on the article page and in search snippets.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    ["title", "Title", "The Ultimate Guide to ..."],
                    ["slug", "Slug", "ijcai-ecai-2026-bremen-guide"],
                    ["seo_title", "SEO title", "Ultimate Guide to IJCAI-ECAI 2026 in Bremen | AI Dose"],
                    ["category", "Category", "Conference Guide"],
                    ["published_at", "Published at (ISO)", "2026-04-08T00:00:00.000Z"]
                  ].map(([name, label, placeholder]) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name as keyof FormValues}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{label}</FormLabel>
                          <FormControl>
                            <Input placeholder={placeholder} {...field} />
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
                          <Textarea rows={4} placeholder="Meta description for search and sharing." {...field} />
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
                          <Textarea rows={4} placeholder="Short intro shown on cards and hero blocks." {...field} />
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
                  <CardDescription>
                    Store article structure as JSON so the frontend can render rich sections consistently.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="keywords"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Keywords JSON</FormLabel>
                        <FormControl>
                          <Textarea rows={6} {...field} />
                        </FormControl>
                        <FormDescription>Example: ["IJCAI 2026", "Bremen AI conference"]</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="table_of_contents"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Table of contents JSON</FormLabel>
                        <FormControl>
                          <Textarea rows={8} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sections"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sections JSON</FormLabel>
                        <FormControl>
                          <Textarea rows={16} {...field} />
                        </FormControl>
                        <FormDescription>
                          Each section should have `id`, `title`, `paragraphs`, and optional `bullets`.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                {mutation.isPending ? "Creating..." : "Create article"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
