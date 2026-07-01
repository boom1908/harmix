import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { searchSongs } from "@/lib/piped";
import { TrackRow } from "@/components/track-row";
import { usePlayerStore } from "@/lib/player-store";
import { Music2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Home — Harmix" },
      { name: "description", content: "Your music, your queue." },
    ],
  }),
  component: HomePage,
});

const SUGGESTIONS = ["Tame Impala", "Kendrick Lamar", "Fred again..", "Radiohead", "Arijit Singh", "Daft Punk"];

function HomePage() {
  const { data: profile } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("display_name").eq("id", u.user.id).maybeSingle();
      return data;
    },
  });

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">
          {greeting()}
          {profile?.display_name ? `, ${profile.display_name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search anything or dive into one of these.
        </p>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4" /> Try a search
        </div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <Link
              key={s}
              to="/search"
              search={{ q: s }}
              className="rounded-full border border-border bg-surface px-4 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {s}
            </Link>
          ))}
        </div>
      </section>

      <QuickPlays />
    </div>
  );
}

function QuickPlays() {
  const q = "top hits 2025";
  const { data, isLoading } = useQuery({
    queryKey: ["quickplays", q],
    queryFn: () => searchSongs(q),
    staleTime: 5 * 60_000,
  });
  const { playQueue } = usePlayerStore.getState();

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Music2 className="h-4 w-4" />
        <h2 className="text-lg font-semibold">Trending now</h2>
      </div>
      {isLoading && (
        <div className="text-sm text-muted-foreground">Loading…</div>
      )}
      <div className="grid gap-1">
        {(data ?? []).slice(0, 12).map((t, i) => (
          <TrackRow
            key={t.videoId}
            track={t}
            index={i}
            onPlay={() => playQueue(data!, i)}
          />
        ))}
      </div>
    </section>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
