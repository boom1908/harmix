import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Search as SearchIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { searchSongs } from "@/lib/piped";
import { TrackRow } from "@/components/track-row";
import { usePlayerStore } from "@/lib/player-store";
import { Input } from "@/components/ui/input";

const schema = z.object({ q: z.string().optional().default("") });

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({
    meta: [
      { title: "Search — Harmix" },
      { name: "description", content: "Search songs, artists, and albums." },
    ],
  }),
  validateSearch: (s) => schema.parse(s),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [text, setText] = useState(q);

  // Debounce URL sync
  useEffect(() => {
    const t = setTimeout(() => {
      if (text !== q) navigate({ search: { q: text }, replace: true });
    }, 300);
    return () => clearTimeout(t);
  }, [text]);

  useEffect(() => setText(q), [q]);

  const { data, isFetching } = useQuery({
    queryKey: ["search", q],
    queryFn: () => searchSongs(q),
    enabled: q.trim().length > 0,
  });

  const { playQueue } = usePlayerStore.getState();

  return (
    <div className="space-y-6">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search songs, artists…"
          className="pl-9 h-11 rounded-full bg-surface border-border text-base"
        />
      </div>

      {q.trim().length === 0 && (
        <p className="text-sm text-muted-foreground">
          Start typing to search across YouTube Music's catalog.
        </p>
      )}

      {isFetching && q && (
        <div className="text-sm text-muted-foreground">Searching…</div>
      )}

      <div className="grid gap-1">
        {(data ?? []).map((t, i) => (
          <TrackRow
            key={t.videoId}
            track={t}
            index={i}
            onPlay={() => playQueue(data!, i)}
          />
        ))}
      </div>

      {data && data.length === 0 && q && !isFetching && (
        <div className="text-sm text-muted-foreground">No results.</div>
      )}
    </div>
  );
}
