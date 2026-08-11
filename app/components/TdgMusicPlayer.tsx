"use client";

import { useEffect, useRef, useState } from "react";

type LyricLine = {
  start: number;
  text: string;
  emphasis?: boolean;
};

const lyrics: LyricLine[] = [
  { start: 6.0, text: "T-D-G! T-D-G! T-D-G!", emphasis: true },

  { start: 11.5, text: "From Dutch soil we proudly stand," },
  { start: 18.0, text: "Side by side across the land." },
  { start: 24.0, text: "Started as players, became a family," },
  { start: 29.7, text: "Bound together by loyalty." },
  { start: 35.0, text: "Through every battle, through every game," },
  { start: 38.0, text: "Together we build the TDG name." },
  { start: 41.0, text: "When one falls down, we lift them high," },
  { start: 45.0, text: "Together we fight, together we rise." },

  { start: 48.5, text: "Hear the silence break apart," },
  { start: 54.0, text: "War drums echo in our heart." },

  { start: 62.6, text: "T-D-G! T-D-G!", emphasis: true },
  { start: 64.0, text: "One family, one destiny!" },
  { start: 68.6, text: "T-D-G! T-D-G!", emphasis: true },
  { start: 71.0, text: "Together strong for all to see!" },
  { start: 75.8, text: "We win together!", emphasis: true },
  { start: 78.5, text: "We lose together!", emphasis: true },
  { start: 81.5, text: "But above all..." },
  { start: 84.6, text: "WE STAY TOGETHER!", emphasis: true },
  { start: 87.0, text: "T-D-G! T-D-G! T-D-G!", emphasis: true },
  { start: 90.0, text: "Forever one, forever free!" },

  { start: 104.0, text: "No matter the rank, no matter the score," },
  { start: 107.0, text: "Family comes first forevermore." },
  { start: 109.5, text: "Through every victory, every fall," },
  { start: 113.0, text: "The TDG spirit stands through it all." },
  { start: 117.0, text: "Side by side, we hold the line," },
  { start: 119.5, text: "Your fight is yours, your fight is mine." },
  { start: 122.0, text: "Through every war and every game," },
  { start: 125.4, text: "We're stronger than we've ever been." },

  { start: 136.0, text: "FOREVER", emphasis: true },
  {
    start: 138.0,
    text: "T-D-G! T-D-G! T-D-G! T-D-G! T-D-G! T-D-G!",
    emphasis: true,
  },
];

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export default function TdgMusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
    };

    const updateDuration = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const currentIndex = lyrics.reduce((index, lyric, i) => {
    if (currentTime >= lyric.start) {
      return i;
    }

    return index;
  }, -1);

  const currentLyric =
    currentIndex >= 0 ? lyrics[currentIndex] : null;

  const nextLyric =
    currentIndex >= 0
      ? lyrics[currentIndex + 1] ?? null
      : lyrics[0] ?? null;

  const isFinalChant =
    currentLyric?.start === 138;

  const progress =
    duration > 0 ? (currentTime / duration) * 100 : 0;

  async function togglePlay() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (error) {
        console.error(
          "TDG Music kon niet worden afgespeeld:",
          error
        );
      }
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }

  function seekBy(seconds: number) {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const newTime = Math.max(
      0,
      Math.min(audio.currentTime + seconds, duration || 0)
    );

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }

  function handleSeek(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const time = Number(event.target.value);

    audio.currentTime = time;
    setCurrentTime(time);
  }

  function handleVolume(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const value = Number(event.target.value);

    audio.volume = value;
    setVolume(value);
  }

  return (
    <>
      <section className="tdg-music-player mx-auto mb-10 w-full max-w-3xl">
        <audio
          ref={audioRef}
          src="/tdg-music/TDG-warsong.mp3"
          preload="metadata"
        />

        {/* TDG MUSIC BANNER */}
        <img
          src="/tdg-music/tdg-music-banner.png"
          alt="TDG Music"
          className="tdg-music-banner mx-auto mb-2 h-auto w-full max-w-lg"
        />

        {/* MUSIC CONSOLE */}
        <div
          className={`relative overflow-hidden rounded-2xl border bg-neutral-950 shadow-2xl transition-all duration-500 ${
            isPlaying
              ? "border-yellow-500/50 shadow-yellow-500/10"
              : "border-neutral-800"
          }`}
        >
          {/* Subtle top glow */}
          <div
            className={`pointer-events-none absolute inset-x-0 top-0 h-px transition-opacity duration-500 ${
              isPlaying
                ? "bg-yellow-400 opacity-100"
                : "bg-neutral-700 opacity-60"
            }`}
          />

          <div className="tdg-music-content px-5 py-4 sm:px-7 sm:py-5">

            {/* HEADER */}
            <div className="flex items-center gap-3">
              <div
                className={`tdg-music-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-lg transition-all duration-500 ${
                  isPlaying
                    ? "border-yellow-500/60 bg-yellow-500/10 text-yellow-400"
                    : "border-neutral-700 bg-neutral-900 text-neutral-500"
                }`}
              >
                🦅
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tracking-wide text-white">
                    TDG FOREVER
                  </span>

                  {isPlaying && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-yellow-500">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-400" />
                      Playing
                    </span>
                  )}
                </div>

                <div className="text-xs text-neutral-500">
                  The Dutch Giant War Song
                </div>
              </div>

              <div className="text-xs tabular-nums text-neutral-500">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            {/* PROGRESS */}
            <div className="mt-4">
              <input
                type="range"
                min="0"
                max={duration || 0}
                step="0.01"
                value={Math.min(
                  currentTime,
                  duration || 0
                )}
                onChange={handleSeek}
                aria-label="Muziek voortgang"
                className="h-1.5 w-full cursor-pointer accent-yellow-500"
                style={{
                  background: `linear-gradient(to right, rgb(234 179 8) ${progress}%, rgb(64 64 64) ${progress}%)`,
                }}
              />
            </div>

            {/* KARAOKE */}
            <div className="tdg-karaoke flex min-h-[94px] flex-col items-center justify-center px-2 py-4 text-center">

              {currentLyric ? (
                <>
                  <div
                    className={`transition-all duration-300 ${
                      currentLyric.emphasis
                        ? "text-2xl font-black tracking-wide text-yellow-400 drop-shadow-[0_0_14px_rgba(250,204,21,0.3)] sm:text-3xl"
                        : "text-lg font-bold text-white sm:text-xl"
                    }`}
                  >
                    {currentLyric.text}
                  </div>

                  {!isFinalChant && nextLyric && (
                    <div className="mt-2 text-sm font-medium text-neutral-600 sm:text-base">
                      {nextLyric.text}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm font-medium uppercase tracking-[0.25em] text-neutral-600">
                  Press play
                </div>
              )}
            </div>

            {/* CONTROLS */}
            <div className="flex items-center justify-between border-t border-neutral-800 pt-3">

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => seekBy(-10)}
                  aria-label="10 seconden terug"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs text-neutral-500 transition hover:bg-neutral-800 hover:text-white"
                >
                  ↶
                </button>

                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label={
                    isPlaying
                      ? "Pauzeren"
                      : "Afspelen"
                  }
                  className={`flex h-11 w-11 items-center justify-center rounded-full border text-lg transition-all duration-300 ${
                    isPlaying
                      ? "border-yellow-500 bg-yellow-500 text-black shadow-lg shadow-yellow-500/20"
                      : "border-yellow-500/70 text-yellow-400 hover:bg-yellow-500 hover:text-black"
                  }`}
                >
                  {isPlaying ? "❚❚" : "▶"}
                </button>

                <button
                  type="button"
                  onClick={() => seekBy(10)}
                  aria-label="10 seconden vooruit"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs text-neutral-500 transition hover:bg-neutral-800 hover:text-white"
                >
                  ↷
                </button>
              </div>

              {/* VOLUME */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500">
                  🔊
                </span>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolume}
                  aria-label="Volume"
                  className="w-20 cursor-pointer accent-yellow-500 sm:w-24"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MOBILE MUSIC PLAYER STYLING */}
      <style jsx>{`
  @media (max-width: 767px) {
    .tdg-music-player {
      margin-bottom: 16px;
    }

    .tdg-music-banner {
      width: 65%;
      max-width: 260px;
      margin-bottom: 4px;
    }

    .tdg-music-content {
      padding: 5px 8px 6px;
    }

    .tdg-music-icon {
      width: 24px;
      height: 24px;
      font-size: 11px;
    }

    .tdg-karaoke {
      min-height: 30px;
      padding-top: 2px;
      padding-bottom: 2px;
    }

    .tdg-karaoke > div:first-child {
      font-size: 12px;
      line-height: 1.1;
    }

    .tdg-karaoke > div:last-child {
      margin-top: 1px;
      font-size: 7px;
      line-height: 1;
    }

    .tdg-music-player input[type="range"] {
      height: 3px;
    }

    .tdg-music-player button {
      transform: scale(0.85);
    }

    .tdg-music-player .border-t {
      padding-top: 2px;
    }
  }
`}</style>
    </>
  );
}