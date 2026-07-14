import { Link } from "@tanstack/react-router";
import { Home, Library, Search, Music2 } from "lucide-react";
import { type ReactNode } from "react";
import { PlayerBar } from "./player-bar";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/search", label: "Search", icon: Search },
  { to: "/library", label: "Library", icon: Library },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col pb-24 sm:pb-28">
      {/* Top bar (desktop) */}
      <header className="sticky top-0 z-30 hidden border-b border-border glass sm:block">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
                <Music2 className="h-4 w-4" />
              </div>
              Harmix
            </Link>
            <nav className="flex items-center gap-1">
              {nav.map((item) => (
                <NavLink key={item.to} to={item.to} label={item.label} Icon={item.icon} />
              ))}
            </nav>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border glass px-4 sm:hidden">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <div className="grid h-6 w-6 place-items-center rounded-md bg-primary text-primary-foreground">
            <Music2 className="h-3.5 w-3.5" />
          </div>
          Harmix
        </Link>
        <Button variant="ghost" size="icon" onClick={signOut}>
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-[76px] z-30 flex border-t border-border glass sm:hidden">
        {nav.map((item) => (
          <MobileNavLink key={item.to} to={item.to} label={item.label} Icon={item.icon} />
        ))}
      </nav>

      <PlayerBar />
    </div>
  );
}

function NavLink({
  to, label, Icon,
}: { to: string; label: string; Icon: typeof Home }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
      activeProps={{ className: "text-foreground bg-accent" }}
      activeOptions={{ exact: to === "/" }}
    >
      <Icon className="h-4 w-4" /> {label}
    </Link>
  );
}

function MobileNavLink({
  to, label, Icon,
}: { to: string; label: string; Icon: typeof Home }) {
  return (
    <Link
      to={to}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground",
      )}
      activeProps={{ className: "text-primary" }}
      activeOptions={{ exact: to === "/" }}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}
