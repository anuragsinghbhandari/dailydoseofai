import { Link } from "@tanstack/react-router";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/40 backdrop-blur-xl supports-[backdrop-filter]:bg-background/20 transition-all">
            <div className="container flex h-16 items-center gap-6">
                <Link to="/" className="flex items-center space-x-2">
                    <span className="font-heading font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-500">
                        AI Dose
                    </span>
                </Link>
                <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
                    <nav className="flex items-center space-x-6">
                        <Link
                            to="/"
                            className="text-sm font-medium transition-colors hover:text-primary"
                            activeProps={{ className: "text-foreground font-semibold" }}
                            inactiveProps={{ className: "text-foreground/60" }}
                        >
                            Home
                        </Link>
                        <Link
                            to="/admin/dashboard"
                            className="text-sm font-medium transition-colors hover:text-primary"
                            activeProps={{ className: "text-foreground font-semibold" }}
                            inactiveProps={{ className: "text-foreground/60" }}
                        >
                            Admin
                        </Link>
                    </nav>
                    <div className="flex items-center gap-2 pl-4 border-l border-border/50">
                        <ThemeToggle />
                    </div>
                </div>
            </div>
        </header>
    );
}
