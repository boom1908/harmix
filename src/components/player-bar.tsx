import { useEffect, useRef, useState } from "react";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Repeat, Repeat1, Shuffle, ListMusic, X, Music2,
} from "lucide-react";
import { usePlayerStore, currentTrack } from "@/lib/player-store";
import { formatDuration, type Track } from "@/lib/piped";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// YouTube IFrame API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

let ytApiPromise: Promise<void> | null = null;
function loadYTApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  });
  return ytApiPromise;
}

export function PlayerBar() {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const track = usePlayerStore(currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const volume = usePlayerStore((s) => s.volume);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);

  const {
    setPlaying, toggle, next, previous, setCurrentTime, setDuration,
    setVolume, toggleShuffle, cycleRepeat, jumpTo, removeAt, clearQueue,
  } = usePlayerStore.getState();

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [queueOpen, setQueueOpen] = useState(false);
  const [muted, setMuted] = useState(false);

  // Init YT player once
  useEffect(() => {
    let cancelled = false;
    loadYTApi().then(() => {
      if (cancelled || !containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        height: "0",
        width: "0",
        playerVars: { autoplay: 0, controls: 0, playsinline: 1, disablekb: 1 },
        events: {
          onReady: () => setReady(true),
          onStateChange: (e: any) => {
            const S = window.YT.PlayerState;
            if (e.data === S.ENDED) next();
            else if (e.data === S.PLAYING) { setPlaying(true); setLoading(false); }
            else if (e.data === S.PAUSED) setPlaying(false);
            else if (e.data === S.BUFFERING) setLoading(true);
          },
          onError: (e: any) => {
            setError(`Playback error (${e.data}) — skipping`);
            setTimeout(next, 800);
          },
        },
      });
    });
    return () => { cancelled = true; };
  }, []);

  // Load new video when track changes
  useEffect(() => {
    if (!ready || !playerRef.current || !track) return;
    setError("");
    setLoading(true);
    try {
      playerRef.current.loadVideoById(track.videoId);
      setDuration(track.duration);
    } catch (e) {
      setError("Failed to load");
    }
  }, [ready, track?.videoId]);

  // Play/pause sync
  useEffect(() => {
    if (!ready || !playerRef.current) return;
    try {
      if (isPlaying) playerRef.current.playVideo();
      else playerRef.current.pauseVideo();
    } catch {}
  }, [isPlaying, ready]);

  // Volume sync
  useEffect(() => {
    if (!ready || !playerRef.current) return;
    try {
      playerRef.current.setVolume(muted ? 0 : Math.round(volume * 100));
    } catch {}
  }, [volume, muted, ready]);

  // Poll current time
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      try {
        const t = p.getCurrentTime?.() ?? 0;
        const d = p.getDuration?.() ?? 0;
        setCurrentTime(t);
        if (d && Math.abs(d - duration) > 1) setDuration(d);
      } catch {}
    }, 500);
    return () => clearInterval(id);
  }, [ready, duration]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      {/* Hidden YT player host */}
      <div className="pointer-events-none fixed -left-[9999px] -top-[9999px] h-0 w-0 overflow-hidden">
        <div ref={containerRef} />
      </div>

      {!track ? null : (
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border glass">
        <div className="h-0.5 w-full bg-muted">
          <div className="h-full bg-primary transition-[width] duration-100" style={{ width: `${progress}%` }} />
        </div>

        <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2 sm:gap-4 sm:px-4 sm:py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-surface">
              {track.thumbnail ? (
                <img src={track.thumbnail} alt="" className="h-full w-full object-cover" />
              ) : (
                <Music2 className="absolute inset-0 m-auto h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{track.title}</div>
              <div className="truncate text-xs text-muted-foreground">
                {error ? <span className="text-destructive">{error}</span> : track.artist}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="hidden sm:flex" onClick={toggleShuffle} aria-label="Shuffle">
                <Shuffle className={cn("h-4 w-4", shuffle && "text-primary")} />
              </Button>
              <Button variant="ghost" size="icon" onClick={previous} aria-label="Previous">
                <SkipBack className="h-5 w-5" />
              </Button>
              <Button size="icon" onClick={toggle} disabled={loading && !isPlaying} className="h-10 w-10 rounded-full" aria-label={isPlaying ? "Pause" : "Play"}>
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                ) : isPlaying ? (
                  <Pause className="h-5 w-5 fill-current" />
                ) : (
                  <Play className="h-5 w-5 fill-current" />
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={next} aria-label="Next">
                <SkipForward className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="hidden sm:flex" onClick={cycleRepeat} aria-label="Repeat">
                {repeat === "one" ? (
                  <Repeat1 className="h-4 w-4 text-primary" />
                ) : (
                  <Repeat className={cn("h-4 w-4", repeat === "all" && "text-primary")} />
                )}
              </Button>
            </div>

            <div className="hidden w-full max-w-md items-center gap-2 text-xs text-muted-foreground sm:flex">
              <span className="tabular-nums">{formatDuration(currentTime)}</span>
              <Slider
                value={[currentTime]}
                max={duration || 1}
                step={1}
                onValueChange={(v) => {
                  try { playerRef.current?.seekTo(v[0], true); } catch {}
                  setCurrentTime(v[0]);
                }}
                className="flex-1"
              />
              <span className="tabular-nums">{formatDuration(duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="ghost" size="icon" onClick={() => setMuted((m) => !m)} aria-label={muted ? "Unmute" : "Mute"}>
                {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Slider value={[muted ? 0 : volume * 100]} max={100} step={1}
                onValueChange={(v) => { setVolume(v[0] / 100); setMuted(false); }}
                className="w-24" />
            </div>
            <Button variant="ghost" size="icon" onClick={() => setQueueOpen((o) => !o)} aria-label="Queue">
              <ListMusic className={cn("h-5 w-5", queueOpen && "text-primary")} />
            </Button>
          </div>
        </div>
      </div>
      )}

      {queueOpen && track && (
        <div className="fixed right-0 top-0 bottom-24 z-50 flex w-full max-w-sm flex-col border-l border-border bg-surface shadow-2xl sm:bottom-24">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <div className="text-sm font-semibold">Up next</div>
              <div className="text-xs text-muted-foreground">{queue.length} tracks in queue</div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={clearQueue}>Clear</Button>
              <Button variant="ghost" size="icon" onClick={() => setQueueOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {queue.map((t, i) => (
              <QueueRow key={`${t.videoId}-${i}`} track={t} isCurrent={i === currentIndex}
                onPlay={() => jumpTo(i)} onRemove={() => removeAt(i)} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function QueueRow({ track, isCurrent, onPlay, onRemove }: {
  track: Track; isCurrent: boolean; onPlay: () => void; onRemove: () => void;
}) {
  return (
    <div className={cn("group flex items-center gap-3 px-3 py-2 hover:bg-accent cursor-pointer", isCurrent && "bg-accent/50")} onClick={onPlay}>
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
        {track.thumbnail && <img src={track.thumbnail} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-sm", isCurrent && "text-primary font-medium")}>{track.title}</div>
        <div className="truncate text-xs text-muted-foreground">{track.artist}</div>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
