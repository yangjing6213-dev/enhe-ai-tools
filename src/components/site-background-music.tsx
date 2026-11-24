"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Pause, Play, Volume1, Volume2 } from "lucide-react";
import { SITE_BACKGROUND_MUSIC_TRACKS } from "@/lib/site-background-music";

type BackgroundMusicTrack = {
  id: string;
  label: string | Readonly<{ zh: string; en: string }>;
  src: string;
};

type MusicControls = {
  tracks: readonly BackgroundMusicTrack[];
  selectedTrackId: string;
  setSelectedTrackId: (id: string) => void;
  volume: number;
  setVolume: (value: number) => void;
  isPlaying: boolean;
  togglePlayback: () => void;
  autoplayBlocked: boolean;
};

const STORAGE_KEY = "enhe-site-background-music";
const SiteBackgroundMusicContext = createContext<MusicControls | null>(null);

function labelFor(track: BackgroundMusicTrack, locale: "zh" | "en") {
  return typeof track.label === "string" ? track.label : track.label[locale];
}

export function SiteBackgroundMusicProvider({
  children,
  tracks = SITE_BACKGROUND_MUSIC_TRACKS,
}: React.PropsWithChildren<{ tracks?: readonly BackgroundMusicTrack[] }>) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const defaultTrack = tracks.find((track) => track.id === "uplifting-acoustic") ?? tracks[0];
  const [selectedTrackId, setSelectedTrackId] = useState(defaultTrack?.id ?? "");
  const [volume, setVolume] = useState(5);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const selectedTrack = tracks.find((track) => track.id === selectedTrackId) ?? tracks[0];

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const settings = JSON.parse(saved) as { trackId?: string; volume?: number };
      if (settings.trackId && tracks.some((track) => track.id === settings.trackId)) {
        setSelectedTrackId(settings.trackId);
      }
      if (typeof settings.volume === "number" && Number.isFinite(settings.volume)) {
        setVolume(Math.min(100, Math.max(0, settings.volume)));
      }
    } catch {
      // Invalid or unavailable local settings should not prevent music controls from working.
    }
  }, [tracks]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ trackId: selectedTrackId, volume }));
    } catch {
      // Playback remains available when browser storage is disabled.
    }
  }, [selectedTrackId, volume]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  const togglePlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !selectedTrack) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }
    try {
      await audio.play();
      setIsPlaying(true);
      setAutoplayBlocked(false);
    } catch {
      setAutoplayBlocked(true);
    }
  }, [isPlaying, selectedTrack]);

  const controls: MusicControls = {
    tracks,
    selectedTrackId,
    setSelectedTrackId,
    volume,
    setVolume,
    isPlaying,
    togglePlayback,
    autoplayBlocked,
  };

  return (
    <SiteBackgroundMusicContext.Provider value={controls}>
      {children}
      {selectedTrack ? (
        <audio
          ref={audioRef}
          src={selectedTrack.src}
          hidden
          loop
          preload="none"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          aria-hidden="true"
        />
      ) : null}
    </SiteBackgroundMusicContext.Provider>
  );
}

export function SiteBackgroundMusicCard({ locale }: { locale: "zh" | "en" }) {
  const controls = useContext(SiteBackgroundMusicContext);
  if (!controls) throw new Error("SiteBackgroundMusicCard must be inside SiteBackgroundMusicProvider");

  const english = locale === "en";

  return (
    <div className="site-background-music-card">
      <div className="site-background-music-track">
        <select
          value={controls.selectedTrackId}
          onChange={(event) => controls.setSelectedTrackId(event.target.value)}
          aria-label={english ? "Background music track" : "背景音乐曲目"}
        >
          {controls.tracks.map((track) => (
            <option value={track.id} key={track.id}>{labelFor(track, locale)}</option>
          ))}
        </select>
      </div>
      <div className="site-background-music-playback">
        <button
          type="button"
          className="user-center-action user-center-action--primary user-center-action--compact"
          onClick={controls.togglePlayback}
          aria-pressed={controls.isPlaying}
        >
          {controls.isPlaying ? <Pause aria-hidden="true" size={16} /> : <Play aria-hidden="true" size={16} />}
          {controls.isPlaying ? english ? "Pause music" : "暂停音乐" : english ? "Play music" : "播放音乐"}
        </button>
      </div>
      <div className="site-background-music-volume">
        <output htmlFor="site-background-music-volume" aria-hidden="true">{Math.round(controls.volume)}%</output>
        <div className="site-background-music-volume-controls">
          <Volume1 size={18} aria-hidden="true" />
          <input
            id="site-background-music-volume"
            type="range"
            min={0}
            max={100}
            step={1}
            value={controls.volume}
            aria-label={english ? "Volume" : "音量"}
            onChange={(event) => controls.setVolume(Number(event.target.value))}
            style={{ "--music-volume": `${controls.volume}%` } as React.CSSProperties}
          />
          <Volume2 size={18} aria-hidden="true" />
        </div>
      </div>
      {controls.autoplayBlocked ? (
        <p className="text-xs text-[var(--marketing-muted)]" role="status">
          {english ? "Your browser blocked automatic playback. Select Play music to start." : "浏览器阻止了自动播放，请点击“播放音乐”开始。"}
        </p>
      ) : null}
    </div>
  );
}
