// Piped API client. Piped mirrors YouTube Music's InnerTube and exposes CORS
// on its public instances, so we can call it straight from the browser.
// Instances can rot; list is ordered by reliability and rotated on failure.

const INSTANCES = [
  "https://api.piped.private.coffee",
  "https://pipedapi.orangenet.cc",
  "https://pipedapi.drgns.space",
  "https://pipedapi.ducks.party",
];

export type Track = {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number; // seconds
};

export type SearchResult = Track & { kind: "song" | "video" };

async function pipedFetch(path: string): Promise<unknown> {
  let lastErr: unknown;
  for (const base of INSTANCES) {
    try {
      const res = await fetch(`${base}${path}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`${base} → ${res.status}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      continue;
    }
  }
  throw new Error(`All Piped instances failed: ${String(lastErr)}`);
}

function pickThumb(thumbnails: unknown): string {
  if (typeof thumbnails === "string") return thumbnails;
  if (Array.isArray(thumbnails) && thumbnails.length > 0) {
    const t = thumbnails[thumbnails.length - 1];
    return typeof t === "string" ? t : (t?.url ?? "");
  }
  return "";
}

function idFromUrl(u: string | undefined): string {
  if (!u) return "";
  const m = u.match(/[?&]v=([^&]+)/) ?? u.match(/\/watch\?v=([^&]+)/);
  return m ? m[1] : u.replace(/^\//, "");
}

type PipedSearchItem = {
  url?: string;
  title?: string;
  name?: string;
  uploaderName?: string;
  uploader?: string;
  artists?: Array<{ name?: string }>;
  thumbnail?: string;
  thumbnails?: Array<{ url?: string }>;
  duration?: number;
  type?: string;
};

export async function searchSongs(q: string): Promise<SearchResult[]> {
  const data = (await pipedFetch(
    `/search?q=${encodeURIComponent(q)}&filter=music_songs`,
  )) as { items?: PipedSearchItem[] };
  const items = data.items ?? [];
  return items
    .filter((it) => it.url && (it.duration ?? 0) > 0)
    .map((it) => ({
      videoId: idFromUrl(it.url),
      title: it.title ?? it.name ?? "Unknown",
      artist:
        it.uploaderName ??
        it.uploader ??
        it.artists?.map((a) => a.name).filter(Boolean).join(", ") ??
        "",
      thumbnail: pickThumb(it.thumbnails ?? it.thumbnail),
      duration: it.duration ?? 0,
      kind: "song" as const,
    }));
}

type PipedStream = {
  url: string;
  mimeType?: string;
  format?: string;
  bitrate?: number;
  quality?: string;
  audioTrackType?: string | null;
};

type PipedStreamsResponse = {
  title?: string;
  uploader?: string;
  thumbnailUrl?: string;
  duration?: number;
  audioStreams?: PipedStream[];
  relatedStreams?: PipedSearchItem[];
};

export type ResolvedStream = {
  audioUrl: string;
  track: Track;
  related: Track[];
};

export async function getStream(videoId: string): Promise<ResolvedStream> {
  const data = (await pipedFetch(`/streams/${videoId}`)) as PipedStreamsResponse;
  const streams = (data.audioStreams ?? []).slice().sort(
    (a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0),
  );
  const best = streams.find((s) => !s.audioTrackType || s.audioTrackType === "ORIGINAL") ?? streams[0];
  if (!best?.url) throw new Error("No audio stream available for this track");

  return {
    audioUrl: best.url,
    track: {
      videoId,
      title: data.title ?? "Unknown",
      artist: data.uploader ?? "",
      thumbnail: data.thumbnailUrl ?? "",
      duration: data.duration ?? 0,
    },
    related: (data.relatedStreams ?? [])
      .filter((it) => it.url && (it.duration ?? 0) > 0)
      .slice(0, 20)
      .map((it) => ({
        videoId: idFromUrl(it.url),
        title: it.title ?? "Unknown",
        artist: it.uploaderName ?? it.uploader ?? "",
        thumbnail: pickThumb(it.thumbnails ?? it.thumbnail),
        duration: it.duration ?? 0,
      })),
  };
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
