import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth";

export const Route = createFileRoute("/admin/_layout")({
    beforeLoad: async () => {
        // Simple check on the client
        const { data: session } = await authClient.getSession();
        if (!session || session.user.role !== "admin") {
            throw redirect({
                to: "/",
            });
        }
    },
    component: AdminLayout
});

function AdminLayout() {
    return (
        <div className="flex min-h-screen bg-muted/40">
            <div className="flex relative flex-col flex-1 w-full mx-auto md:max-w-6xl">
                <main className="flex-1 overflow-x-hidden pt-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
