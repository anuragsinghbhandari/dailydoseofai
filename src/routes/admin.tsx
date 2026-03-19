import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getServerSession } from "@/server/auth-state";
import { createNoIndexHead } from "@/lib/seo";

export const Route = createFileRoute("/admin")({
    head: () =>
        createNoIndexHead(
            "Admin | AI Dose",
            "Administrative interface for managing AI Dose content."
        ),
    beforeLoad: async () => {
        // Secure server-side check
        const session = await getServerSession();
        if (!session || (session?.user as any).role !== "admin") {
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
