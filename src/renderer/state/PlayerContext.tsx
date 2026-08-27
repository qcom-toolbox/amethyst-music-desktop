import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import type { RepeatMode, Track } from "../../shared/types";

function shuffledOrderKeepingFirst(length: number, first: number): number[] {
  const rest = Array.from({ length }, (_, i) => i).filter((i) => i !== first);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [first, ...rest];
}

interface PlayerContextValue {
  queue: Track[];
  /** `queue` re-ordered to match actual playback order (shuffle-aware) — what the fullscreen player's queue tab shows. */
  orderedQueue: Track[];
  /** Index of the currently playing track within `orderedQueue`. */
  currentOrderIndex: number;
  currentTrack: Track | null;
  isPlaying: boolean;
  shuffle: boolean;
  repeatMode: RepeatMode;
  volume: number;
  position: number;
  duration: number;
  playQueue: (tracks: Track[], startIndex: number) => void;
  /** Jump directly to a track by its position in `orderedQueue`. */
  jumpTo: (orderIndex: number) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  setVolume: (v: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

const VOLUME_KEY = "amethyst_volume";

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(new Audio());
  const [queue, setQueue] = useState<Track[]>([]);
  const [order, setOrder] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [volume, setVolumeState] = useState<number>(() => {
    const saved = Number(localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(saved) && saved > 0 ? saved : 0.8;
  });
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const lastIncrementedTrackId = useRef<number | null>(null);
  // The native `ended` listener below is attached once (empty deps) so it never picks
  // up new closures on its own; routing it through a ref that's reassigned every render
  // keeps it calling the *current* handleEnded (with fresh repeatMode/queue/order)
  // instead of forever replaying whatever those were on the very first render.
  const handleEndedRef = useRef<() => void>(() => {});

  const currentTrack = queue.length > 0 ? (queue[order[currentIndex]] ?? null) : null;

  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = volume;

    const onTime = () => setPosition(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => handleEndedRef.current();

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAndPlay = useCallback(async (track: Track) => {
    const audio = audioRef.current;
    const url = await window.amethyst.library.streamUrl(track.id);
    audio.src = url;
    audio.currentTime = 0;
    setPosition(0);
    try {
      await audio.play();
    } catch {
      // Autoplay can be blocked in edge cases (e.g. no user gesture yet) — the user
      // can press play again; nothing else to do here.
    }
    if (lastIncrementedTrackId.current !== track.id) {
      lastIncrementedTrackId.current = track.id;
      void window.amethyst.library.incrementPlay(track.id);
    }
  }, []);

  const playQueue = useCallback(
    (tracks: Track[], startIndex: number) => {
      setQueue(tracks);
      const newOrder = shuffle
        ? shuffledOrderKeepingFirst(tracks.length, startIndex)
        : tracks.map((_, i) => i);
      setOrder(newOrder);
      setCurrentIndex(0);
      const track = tracks[startIndex];
      if (track) void loadAndPlay(track);
    },
    [shuffle, loadAndPlay]
  );

  const orderedQueue = useMemo(() => order.map((i) => queue[i]).filter((t): t is Track => Boolean(t)), [order, queue]);

  const jumpTo = useCallback(
    (orderIndex: number) => {
      if (orderIndex < 0 || orderIndex >= order.length) return;
      setCurrentIndex(orderIndex);
      const track = queue[order[orderIndex]];
      if (track) void loadAndPlay(track);
    },
    [order, queue, loadAndPlay]
  );

  const advance = useCallback(
    (direction: 1 | -1) => {
      if (order.length === 0) return;
      let nextIndex = currentIndex + direction;
      if (nextIndex < 0) {
        nextIndex = repeatMode === "queue" ? order.length - 1 : 0;
      } else if (nextIndex >= order.length) {
        if (repeatMode === "queue") nextIndex = 0;
        else {
          audioRef.current.pause();
          return;
        }
      }
      setCurrentIndex(nextIndex);
      const track = queue[order[nextIndex]];
      if (track) void loadAndPlay(track);
    },
    [order, currentIndex, repeatMode, queue, loadAndPlay]
  );

  function handleEnded() {
    if (repeatMode === "track") {
      const audio = audioRef.current;
      audio.currentTime = 0;
      void audio.play();
      return;
    }
    advance(1);
  }
  handleEndedRef.current = handleEnded;

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!currentTrack) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  }, [currentTrack]);

  const next = useCallback(() => advance(1), [advance]);

  const prev = useCallback(() => {
    const audio = audioRef.current;
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    advance(-1);
  }, [advance]);

  const seek = useCallback((seconds: number) => {
    audioRef.current.currentTime = seconds;
    setPosition(seconds);
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    audioRef.current.volume = clamped;
    setVolumeState(clamped);
    localStorage.setItem(VOLUME_KEY, String(clamped));
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((prevShuffle) => {
      const enabling = !prevShuffle;
      if (queue.length > 0) {
        const currentTrackIndex = order[currentIndex] ?? 0;
        const newOrder = enabling
          ? shuffledOrderKeepingFirst(queue.length, currentTrackIndex)
          : queue.map((_, i) => i);
        setOrder(newOrder);
        setCurrentIndex(newOrder.indexOf(currentTrackIndex));
      }
      return enabling;
    });
  }, [queue, order, currentIndex]);

  const cycleRepeat = useCallback(() => {
    setRepeatMode((m) => (m === "off" ? "queue" : m === "queue" ? "track" : "off"));
  }, []);

  // Discord presence: push on every state-relevant change, plus a periodic heartbeat
  // while playing so elapsed time stays accurate (Discord recommends >=15s between updates).
  useEffect(() => {
    if (!currentTrack) {
      void window.amethyst.discord.clearPresence();
      return;
    }
    void window.amethyst.discord.updatePresence({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album,
      isPlaying,
      positionSeconds: audioRef.current.currentTime,
      durationSeconds: duration || currentTrack.duration
    });
  }, [currentTrack, isPlaying, duration]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      if (!currentTrack) return;
      void window.amethyst.discord.updatePresence({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album,
        isPlaying: true,
        positionSeconds: audioRef.current.currentTime,
        durationSeconds: duration || currentTrack.duration
      });
    }, 20000);
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack, duration]);

  const value = useMemo<PlayerContextValue>(
    () => ({
      queue,
      orderedQueue,
      currentOrderIndex: currentIndex,
      currentTrack,
      isPlaying,
      shuffle,
      repeatMode,
      volume,
      position,
      duration,
      playQueue,
      jumpTo,
      togglePlay,
      next,
      prev,
      seek,
      setVolume,
      toggleShuffle,
      cycleRepeat
    }),
    [
      queue,
      orderedQueue,
      currentIndex,
      currentTrack,
      isPlaying,
      shuffle,
      repeatMode,
      volume,
      position,
      duration,
      playQueue,
      jumpTo,
      togglePlay,
      next,
      prev,
      seek,
      setVolume,
      toggleShuffle,
      cycleRepeat
    ]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
