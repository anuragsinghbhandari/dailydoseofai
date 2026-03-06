import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAllUpdates } from "@/server/queries";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { deleteUpdate, updateUpdate } from "@/server/updates";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminDashboardPage
});

function AdminDashboardPage() {
  // TODO: add real auth/guard when auth is implemented

  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["admin", "updates"],
    queryFn: () => getAllUpdates()
  });

  const publishMutation = useMutation({
    mutationFn: (payload: { id: string; published: boolean }) =>
      (updateUpdate as any)({
        data: {
          id: payload.id,
          data: { published: payload.published }
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "updates"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => (deleteUpdate as any)({ data: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "updates"] });
    }
  });

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Link to="/admin/create-update">
            <Button>Create update</Button>
          </Link>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* We can add stats cards here in the future */}
      </div>
      <div className="hidden h-full flex-1 flex-col space-y-8 md:flex">
        <div className="rounded-md border bg-card text-card-foreground shadow">
          {listQuery.isLoading ? (
            <div className="p-4">
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[400px]">Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Impact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No updates found.
                    </TableCell>
                  </TableRow>
                ) : null}
                {listQuery.data?.map((update) => (
                  <TableRow key={update.id}>
                    <TableCell className="font-medium">
                      <div className="line-clamp-2">{update.title}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{update.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{update.impact_score}/10</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={update.published}
                          disabled={publishMutation.isPending}
                          onCheckedChange={(checked) =>
                            publishMutation.mutate({
                              id: update.id,
                              published: checked
                            })
                          }
                        />
                        <span className="text-sm text-muted-foreground hidden lg:inline-block">
                          {update.published ? "Published" : "Draft"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {new Date(update.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          to="/admin/edit-update/$id"
                          params={{ id: update.id }}
                        >
                          <Button size="sm" variant="ghost">
                            Edit
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (window.confirm("Are you sure you want to delete this update?")) {
                              deleteMutation.mutate(update.id);
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}

