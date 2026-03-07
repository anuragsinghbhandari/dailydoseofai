import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  updateUpdate,
  type NewUpdate
} from "@/server/updates";
import { getAllUpdates } from "@/server/queries";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/admin/edit-update/$id")({
  component: EditUpdatePage
});

const formSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(3),
  summary: z.string().min(10),
  why_it_matters: z.string().min(10),
  content: z.string().min(10),
  category: z.string().min(2),
  impact_score: z.coerce.number().min(0).max(10),
  source_url: z.string().url().or(z.literal("")),
  published: z.boolean()
});

type FormValues = z.infer<typeof formSchema>;

const CATEGORIES = [
  "Models",
  "Tools",
  "Research",
  "Business",
  "Hardware",
  "Policy"
];

function EditUpdatePage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const listQuery = useQuery({
    queryKey: ["admin", "updates"],
    queryFn: () => getAllUpdates()
  });

  const existing = listQuery.data?.find(
    (u) => u.id === id
  ) as (NewUpdate & { id: string }) | undefined;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    values: existing
      ? {
        title: existing.title,
        slug: existing.slug,
        summary: existing.summary,
        why_it_matters: existing.why_it_matters,
        content: existing.content,
        category: existing.category,
        impact_score: existing.impact_score ?? 0,
        source_url: existing.source_url ?? "",
        published: existing.published ?? false
      }
      : undefined
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      (updateUpdate as any)({ data: { id, data: values } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin", "updates"]
      });
      toast({
        title: "Success",
        description: "The update was modified successfully.",
      });
      router.navigate({ to: "/admin/dashboard" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to modify the update. Please try again.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };

  if (listQuery.isLoading || !existing) {
    return (
      <div className="container max-w-4xl space-y-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl space-y-8 py-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/admin/dashboard">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit update</h1>
          <p className="text-sm text-muted-foreground">
            Update the content or publishing status for this AI update.
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-8">
          <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>
                    The core details of the update.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          The URL-friendly version of the title.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="summary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Summary</FormLabel>
                        <FormControl>
                          <Textarea rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="source_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source URL (Optional)</FormLabel>
                        <FormControl>
                          <Input type="url" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="why_it_matters"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Why it matters</FormLabel>
                        <FormControl>
                          <Textarea rows={4} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Details</FormLabel>
                        <FormControl>
                          <Textarea rows={10} {...field} />
                        </FormControl>
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
                  <CardTitle>Metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CATEGORIES.map(category => (
                              <SelectItem key={category} value={category}>{category}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="impact_score"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Impact score (0-10)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={10}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Publishing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="published"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Publish immediately
                          </FormLabel>
                          <FormDescription>
                            Make this update visible on the site.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="pt-4">
                    <Button type="submit" disabled={mutation.isPending} className="w-full">
                      {mutation.isPending ? "Saving..." : "Save changes"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}

