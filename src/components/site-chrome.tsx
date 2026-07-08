import { Link } from "@tanstack/react-router";
import { schemeSevaLogo } from "@/lib/logo";

export function SiteHeader() {
    return (
        <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
                <Link to="/" className="flex items-center gap-2.5">
                    <img src={schemeSevaLogo} alt="" width={36} height={36} className="h-9 w-9" />
                    <div className="flex flex-col leading-none">
                        <span className="font-display text-xl font-semibold text-primary">SchemeSeva</span>
                        <span className="text-[11px] font-medium tracking-wide text-muted-foreground">
                            Civic AI · Government schemes for every citizen
                        </span>
                    </div>
                </Link>
                <nav className="flex items-center gap-1 text-sm">
                    <Link
                        to="/"
                        className="rounded-md px-3 py-2 font-medium text-muted-foreground hover:text-primary"
                        activeOptions={{ exact: true }}
                        activeProps={{ className: "text-primary" }}
                    >
                        Home
                    </Link>
                    <Link
                        to="/architecture"
                        className="rounded-md px-3 py-2 font-medium text-muted-foreground hover:text-primary"
                        activeProps={{ className: "text-primary" }}
                    >
                        Architecture
                    </Link>
                    <Link
                        to="/schemes"
                        className="rounded-md px-3 py-2 font-medium text-muted-foreground hover:text-primary"
                        activeProps={{ className: "text-primary" }}
                    >
                        Schemes
                    </Link>
                    <Link
                        to="/app"
                        className="ml-2 inline-flex items-center rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground shadow-sm transition hover:opacity-95"
                        activeProps={{ className: "opacity-95" }}
                    >
                        Launch agent →
                    </Link>
                </nav>
            </div>
        </header>
    );
}

export function SiteFooter() {
    return (
        <footer className="mt-16 border-t border-border/60 bg-parchment/40">
            <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <p>
                    SchemeSeva · Built for the HiDevs × Mastra Hackathon 2026 · By Kaushik Yellanki
                </p>
                <p className="text-xs">
                    Guidance tool, not legal advice. Confirm eligibility on official portals.
                </p>
            </div>
        </footer>
    );
}
