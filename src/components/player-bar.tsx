import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Repeat1,
  Shuffle,
  ListMusic,
  X,
  Music2,
} from "lucide-react";
import { usePlayerStore, currentTrack } from "@/lib/player-store";
import { formatDuration, getStream, type Track } from "@/lib/piped";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PlayerBar() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
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

  const [audioUrl, setAudioUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [queueOpen, setQueueOpen] = useState(false);
  const [muted, setMuted] = useState(false);

  // Resolve stream URL when track changes
  useEffect(() => {
    if (!track) {
      setAudioUrl("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    getStream(track.videoId)
      .then((r) => {
        if (cancelled) return;
        setAudioUrl(r.audioUrl);
        setDuration(r.track.duration || track.duration);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Playback failed");
        setPlaying(false);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [track?.videoId]);

  // Sync play/pause
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) a.play().catch(() => setPlaying(false));
    else a.pause();
  }, [isPlaying, audioUrl]);

  useEffect(() => {
    const a = audioRef.current;
    if (a) a.volume = muted ? 0 : volume;
  }, [volume, muted]);

  if (!track) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || track.duration)}
        onEnded={next}
        onError={() => setError("Stream error — skipping")}
      />

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border glass">
        {/* progress line */}
        <div className="h-0.5 w-full bg-muted">
          <div
            className="h-full bg-primary transition-[width] duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2 sm:gap-4 sm:px-4 sm:py-3">
          {/* Track info */}
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

          {/* Controls */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="hidden sm:flex" onClick={toggleShuffle}
                aria-label="Shuffle">
                <Shuffle className={cn("h-4 w-4", shuffle && "text-primary")} />
              </Button>
              <Button variant="ghost" size="icon" onClick={previous} aria-label="Previous">
                <SkipBack className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                onClick={toggle}
                disabled={loading}
                className="h-10 w-10 rounded-full"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
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
              <Button variant="ghost" size="icon" className="hidden sm:flex" onClick={cycleRepeat}
                aria-label="Repeat">
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
                  const a = audioRef.current;
                  if (a) a.currentTime = v[0];
                  setCurrentTime(v[0]);
                }}
                className="flex-1"
              />
              <span className="tabular-nums">{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-1">
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="ghost" size="icon" onClick={() => setMuted((m) => !m)}
                aria-label={muted ? "Unmute" : "Mute"}>
                {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Slider
                value={[muted ? 0 : volume * 100]}
                max={100}
                step={1}
                onValueChange={(v) => {
                  setVolume(v[0] / 100);
                  setMuted(false);
                }}
                className="w-24"
              />
            </div>
            <Button variant="ghost" size="icon" onClick={() => setQueueOpen((o) => !o)}
              aria-label="Queue">
              <ListMusic className={cn("h-5 w-5", queueOpen && "text-primary")} />
            </Button>
          </div>
        </div>
      </div>

      {queueOpen && (
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
              <QueueRow
                key={`${t.videoId}-${i}`}
                track={t}
                isCurrent={i === currentIndex}
                onPlay={() => jumpTo(i)}
                onRemove={() => removeAt(i)}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function QueueRow({
  track, isCurrent, onPlay, onRemove,
}: {
  track: Track;
  isCurrent: boolean;
  onPlay: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-3 py-2 hover:bg-accent cursor-pointer",
        isCurrent && "bg-accent/50",
      )}
      onClick={onPlay}
    >
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
        {track.thumbnail && <img src={track.thumbnail} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-sm", isCurrent && "text-primary font-medium")}>
          {track.title}
        </div>
        <div className="truncate text-xs text-muted-foreground">{track.artist}</div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
