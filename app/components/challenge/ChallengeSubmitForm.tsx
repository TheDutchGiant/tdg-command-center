"use client";

import { useState } from "react";

export default function ChallengeSubmitForm() {
  const [playerTag, setPlayerTag] =
    useState("");

  const [playerName, setPlayerName] =
    useState("");

  const [stars, setStars] =
    useState("");

  const [destruction, setDestruction] =
    useState("");

  const [timeSeconds, setTimeSeconds] =
    useState("");

  const [screenshot, setScreenshot] =
    useState<File | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  async function submit() {
    setMessage("");

    if (
      !playerTag.trim() ||
      !playerName.trim() ||
      !screenshot
    ) {
      setMessage(
        "Vul je gegevens in en voeg een screenshot toe."
      );
      return;
    }

    setLoading(true);

    try {
      /*
       * De afbeelding wordt voorlopig lokaal als
       * bestand meegestuurd. De server/OCR-laag
       * krijgt hem straks voor de echte controle.
       */
      const formData = new FormData();

      formData.append(
        "playerTag",
        playerTag.trim().toUpperCase()
      );

      formData.append(
        "playerName",
        playerName.trim()
      );

      formData.append(
        "stars",
        stars
      );

      formData.append(
        "destruction",
        destruction
      );

      if (timeSeconds.trim()) {
        formData.append(
          "timeSeconds",
          timeSeconds
        );
      }

      formData.append(
        "screenshot",
        screenshot
      );

      const response =
        await fetch(
          "/api/challenge/submit",
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        setMessage(
          data.error ||
            "Inzending mislukt."
        );
        return;
      }

      setMessage(
        data.needsReview
          ? "🟡 Inzending ontvangen. Phoenix controleert deze."
          : "🟢 Inzending automatisch gevalideerd!"
      );

      setScreenshot(null);
    } catch {
      setMessage(
        "Er kon geen verbinding met Phoenix worden gemaakt."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-5 space-y-3">

      <input
        value={playerName}
        onChange={(event) =>
          setPlayerName(
            event.target.value
          )
        }
        placeholder="Clash naam"
        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-orange-400/40"
      />

      <input
        value={playerTag}
        onChange={(event) =>
          setPlayerTag(
            event.target.value
          )
        }
        placeholder="#PlayerTag"
        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 font-mono text-sm text-white outline-none placeholder:text-white/25 focus:border-orange-400/40"
      />

      <div className="grid grid-cols-3 gap-2">
        <input
          type="number"
          min="0"
          max="3"
          value={stars}
          onChange={(event) =>
            setStars(event.target.value)
          }
          placeholder="⭐"
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none placeholder:text-white/25"
        />

        <input
          type="number"
          min="0"
          max="100"
          value={destruction}
          onChange={(event) =>
            setDestruction(
              event.target.value
            )
          }
          placeholder="%"
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none placeholder:text-white/25"
        />

        <input
          type="number"
          min="0"
          value={timeSeconds}
          onChange={(event) =>
            setTimeSeconds(
              event.target.value
            )
          }
          placeholder="Tijd"
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none placeholder:text-white/25"
        />
      </div>

      <label className="block cursor-pointer rounded-xl border border-dashed border-white/15 bg-black/20 px-4 py-5 text-center hover:border-orange-400/30">
        <span className="text-sm font-semibold">
          📸 Screenshot kiezen
        </span>

        <span className="mt-1 block text-[10px] text-white/30">
          Phoenix gebruikt deze voor automatische controle.
        </span>

        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) =>
            setScreenshot(
              event.target.files?.[0] ??
                null
            )
          }
        />

        {screenshot && (
          <span className="mt-2 block truncate text-xs text-orange-300">
            {screenshot.name}
          </span>
        )}
      </label>

      <button
        type="button"
        disabled={loading}
        onClick={submit}
        className="w-full rounded-xl border border-orange-400/25 bg-orange-500/10 px-4 py-3 text-sm font-bold text-orange-200 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "🔥 Phoenix controleert..."
          : "🚀 Challenge resultaat indienen"}
      </button>

      {message && (
        <p className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-center text-xs text-white/60">
          {message}
        </p>
      )}

    </div>
  );
}
