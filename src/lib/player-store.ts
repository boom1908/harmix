import { create } from "zustand";
import type { Track } from "./piped";

type PlayerState = {
  queue: Track[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: "off" | "one" | "all";

  playNow: (track: Track, queue?: Track[]) => void;
  playQueue: (tracks: Track[], startIndex?: number) => void;
  addNext: (track: Track) => void;
  addToQueue: (track: Track) => void;
  removeAt: (index: number) => void;
  clearQueue: () => void;
  next: () => void;
  previous: () => void;
  jumpTo: (index: number) => void;
  setPlaying: (v: boolean) => void;
  toggle: () => void;
  setCurrentTime: (t: number) => void;
  setDuration: (d: number) => void;
  setVolume: (v: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  currentIndex: -1,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  shuffle: false,
  repeat: "off",

  playNow: (track, queue) => {
    if (queue && queue.length > 0) {
      const idx = queue.findIndex((t) => t.videoId === track.videoId);
      set({ queue, currentIndex: idx >= 0 ? idx : 0, isPlaying: true, currentTime: 0 });
    } else {
      const q = get().queue;
      const existing = q.findIndex((t) => t.videoId === track.videoId);
      if (existing >= 0) {
        set({ currentIndex: existing, isPlaying: true, currentTime: 0 });
      } else {
        set({ queue: [track], currentIndex: 0, isPlaying: true, currentTime: 0 });
      }
    }
  },

  playQueue: (tracks, startIndex = 0) =>
    set({ queue: tracks, currentIndex: startIndex, isPlaying: true, currentTime: 0 }),

  addNext: (track) => {
    const { queue, currentIndex } = get();
    const filtered = queue.filter((t) => t.videoId !== track.videoId);
    const insertAt = currentIndex + 1;
    const newQueue = [...filtered.slice(0, insertAt), track, ...filtered.slice(insertAt)];
    set({ queue: newQueue });
  },

  addToQueue: (track) => {
    const { queue } = get();
    if (queue.some((t) => t.videoId === track.videoId)) return;
    set({ queue: [...queue, track] });
  },

  removeAt: (index) => {
    const { queue, currentIndex } = get();
    const newQueue = queue.filter((_, i) => i !== index);
    let newIndex = currentIndex;
    if (index < currentIndex) newIndex -= 1;
    else if (index === currentIndex) newIndex = Math.min(currentIndex, newQueue.length - 1);
    set({ queue: newQueue, currentIndex: newIndex });
  },

  clearQueue: () => set({ queue: [], currentIndex: -1, isPlaying: false }),

  next: () => {
    const { queue, currentIndex, repeat, shuffle } = get();
    if (queue.length === 0) return;
    if (repeat === "one") {
      set({ currentTime: 0, isPlaying: true });
      return;
    }
    if (shuffle) {
      const options = queue.map((_, i) => i).filter((i) => i !== currentIndex);
      const nextIdx = options[Math.floor(Math.random() * options.length)] ?? 0;
      set({ currentIndex: nextIdx, isPlaying: true, currentTime: 0 });
      return;
    }
    if (currentIndex >= queue.length - 1) {
      if (repeat === "all") set({ currentIndex: 0, isPlaying: true, currentTime: 0 });
      else set({ isPlaying: false });
      return;
    }
    set({ currentIndex: currentIndex + 1, isPlaying: true, currentTime: 0 });
  },

  previous: () => {
    const { currentIndex, currentTime } = get();
    if (currentTime > 4) {
      set({ currentTime: 0 });
      return;
    }
    if (currentIndex > 0) {
      set({ currentIndex: currentIndex - 1, currentTime: 0, isPlaying: true });
    } else {
      set({ currentTime: 0 });
    }
  },

  jumpTo: (index) => set({ currentIndex: index, isPlaying: true, currentTime: 0 }),
  setPlaying: (v) => set({ isPlaying: v }),
  toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setCurrentTime: (t) => set({ currentTime: t }),
  setDuration: (d) => set({ duration: d }),
  setVolume: (v) => set({ volume: v }),
  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  cycleRepeat: () =>
    set((s) => ({ repeat: s.repeat === "off" ? "all" : s.repeat === "all" ? "one" : "off" })),
}));

export const currentTrack = (state: PlayerState) =>
  state.currentIndex >= 0 ? state.queue[state.currentIndex] : undefined;
