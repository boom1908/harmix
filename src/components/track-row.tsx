import { Play, Plus, ListPlus, MoreHorizontal, Music2 } from "lucide-react";
import { formatDuration, type Track } from "@/lib/piped";
import { usePlayerStore } from "@/lib/player-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  track: Track;
  onPlay?: () => void;
  index?: number;
};

export function TrackRow({ track, onPlay, index }: Props) {
  const { addNext, addToQueue, playNow } = usePlayerStore.getState();

  const { data: playlists } = useQuery({
    queryKey: ["playlists-simple"],
    queryFn: async () => {
      const { data } = await supabase.from("playlists").select("id, name").order("created_at", { ascending: false });
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const handleAddToPlaylist = async (playlistId: string) => {
    const { data: max } = await supabase
      .from("playlist_items")
      .select("position")
      .eq("playlist_id", playlistId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextPos = (max?.position ?? -1) + 1;
    const { error } = await supabase.from("playlist_items").insert({
      playlist_id: playlistId,
      video_id: track.videoId,
      title: track.title,
      artist: track.artist,
      thumbnail_url: track.thumbnail,
      duration: track.duration,
      position: nextPos,
    });
    if (error) toast.error(error.message);
    else toast.success("Added to playlist");
  };

  return (
    <div
      className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent cursor-pointer"
      onClick={onPlay ?? (() => playNow(track))}
    >
      {typeof index === "number" && (
        <div className="hidden w-6 shrink-0 text-center text-xs text-muted-foreground group-hover:hidden sm:block">
          {index + 1}
        </div>
      )}
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded bg-muted">
        {track.thumbnail ? (
          <img src={track.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <Music2 className="absolute inset-0 m-auto h-4 w-4 text-muted-foreground" />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
          <Play className="h-4 w-4 fill-white text-white" />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{track.title}</div>
        <div className="truncate text-xs text-muted-foreground">{track.artist}</div>
      </div>
      <div className="hidden text-xs text-muted-foreground tabular-nums sm:block">
        {formatDuration(track.duration)}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 focus:opacity-100">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => addNext(track)}>
            <ListPlus className="mr-2 h-4 w-4" /> Play next
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addToQueue(track)}>
            <Plus className="mr-2 h-4 w-4" /> Add to queue
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Plus className="mr-2 h-4 w-4" /> Add to playlist
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {(playlists ?? []).length === 0 ? (
                <DropdownMenuItem disabled>No playlists yet</DropdownMenuItem>
              ) : (
                (playlists ?? []).map((p) => (
                  <DropdownMenuItem key={p.id} onClick={() => handleAddToPlaylist(p.id)}>
                    {p.name}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
