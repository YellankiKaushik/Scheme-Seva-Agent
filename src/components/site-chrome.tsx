import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { schemeSevaLogo } from "@/lib/logo";

const navLinkBase =
  "inline-flex min-h-10 items-center justify-center rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const navLinkActive = "bg-secondary text-primary";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <img src={schemeSevaLogo} alt="" width={36} height={36} className="h-9 w-9" />
          <div className="flex min-w-0 flex-col leading-none">
            <span className="font-display text-xl font-semibold text-primary">SchemeSeva</span>
            <span className="truncate text-[11px] font-medium tracking-wide text-muted-foreground">
              Civic AI for source-grounded scheme discovery
            </span>
          </div>
        </Link>
        <nav
          aria-label="Primary navigation"
          className="grid grid-cols-2 gap-2 text-sm sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:gap-1"
        >
          <NavLink to="/" exact>
            Home
          </NavLink>
          <NavLink to="/schemes">Schemes</NavLink>
          <NavLink to="/architecture">Architecture</NavLink>
          <NavLink to="/debug/integrations">Integrations</NavLink>
          <Link
            to="/app"
            className="col-span-2 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:col-span-1 sm:ml-2"
          >
            Launch agent <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </nav>
      </div>
    </header>
  );
}

function NavLink({
  to,
  exact = false,
  children,
}: {
  to: "/" | "/architecture" | "/schemes" | "/debug/integrations";
  exact?: boolean;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isActive = exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);

  return (
    <Link
      to={to}
      className={`${navLinkBase} ${isActive ? navLinkActive : ""}`}
      activeOptions={{ exact }}
    >
      {children}
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border/60 bg-parchment/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>SchemeSeva - Built for the HiDevs x Mastra Hackathon 2026 - By Kaushik Yellanki</p>
        <p className="text-xs">
          Guidance tool, not legal advice. Confirm eligibility on official portals.
        </p>
      </div>
    </footer>
  );
}
