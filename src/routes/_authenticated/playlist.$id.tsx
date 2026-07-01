import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlayerStore } from "@/lib/player-store";
import type { Track } from "@/lib/piped";
import { Button } from "@/components/ui/button";
import { Play, Trash2, ListMusic, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { TrackRow } from "@/components/track-row";

export const Route = createFileRoute("/_authenticated/playlist/$id")({
  component: PlaylistPage,
});

function PlaylistPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["playlist", id],
    queryFn: async () => {
      const [{ data: pl }, { data: items }] = await Promise.all([
        supabase.from("playlists").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("playlist_items")
          .select("*")
          .eq("playlist_id", id)
          .order("position", { ascending: true }),
      ]);
      return { playlist: pl, items: items ?? [] };
    },
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!data?.playlist) return <div className="text-sm text-muted-foreground">Playlist not found.</div>;

  const tracks: Track[] = data.items.map((i) => ({
    videoId: i.video_id,
    title: i.title,
    artist: i.artist ?? "",
    thumbnail: i.thumbnail_url ?? "",
    duration: i.duration ?? 0,
  }));

  const { playQueue, toggleShuffle } = usePlayerStore.getState();

  const deletePlaylist = async () => {
    if (!confirm("Delete this playlist?")) return;
    const { error } = await supabase.from("playlists").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["playlists"] });
    qc.invalidateQueries({ queryKey: ["playlists-simple"] });
    router.navigate({ to: "/library" });
  };

  const removeItem = async (itemId: string) => {
    const { error } = await supabase.from("playlist_items").delete().eq("id", itemId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["playlist", id] });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="grid h-40 w-40 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary/40 to-primary/5 shadow-lg">
          <ListMusic className="h-16 w-16 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Playlist</div>
          <h1 className="mt-1 truncate text-3xl font-semibold tracking-tight sm:text-4xl">
            {data.playlist.name}
          </h1>
          {data.playlist.description && (
            <p className="mt-1 text-sm text-muted-foreground">{data.playlist.description}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">{tracks.length} tracks</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              onClick={() => tracks.length > 0 && playQueue(tracks, 0)}
              disabled={tracks.length === 0}
            >
              <Play className="mr-2 h-4 w-4 fill-current" /> Play
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (tracks.length === 0) return;
                toggleShuffle();
                playQueue(tracks, Math.floor(Math.random() * tracks.length));
              }}
              disabled={tracks.length === 0}
            >
              <Shuffle className="mr-2 h-4 w-4" /> Shuffle
            </Button>
            <Button variant="ghost" onClick={deletePlaylist}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-1">
        {data.items.map((item, i) => (
          <div key={item.id} className="group relative">
            <TrackRow
              track={{
                videoId: item.video_id,
                title: item.title,
                artist: item.artist ?? "",
                thumbnail: item.thumbnail_url ?? "",
                duration: item.duration ?? 0,
              }}
              index={i}
              onPlay={() => playQueue(tracks, i)}
            />
            <button
              onClick={() => removeItem(item.id)}
              className="absolute right-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
              aria-label="Remove"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {tracks.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No tracks yet. Search for something and use the ⋯ menu to add it here.
          </div>
        )}
      </div>
    </div>
  );
}
