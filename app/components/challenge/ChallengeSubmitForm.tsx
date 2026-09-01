"use client";

import { useState } from "react";

type Props = {
  challengeId: number;
  difficulty: string;
};

export default function ChallengeSubmitForm({
  challengeId,
  difficulty,
}: Props) {
  const [screenshot, setScreenshot] =
    useState<File | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  async function submit() {
    setMessage("");

    if (!screenshot) {
      setMessage(
        "Voeg eerst je screenshot toe.",
      );
      return;
    }

    setLoading(true);

    try {
      const formData =
        new FormData();

      formData.append(
        "challengeId",
        String(challengeId),
      );

      formData.append(
        "difficulty",
        difficulty,
      );

      formData.append(
        "screenshot",
        screenshot,
      );

      const response =
        await fetch(
          "/api/challenge/submit",
          {
            method: "POST",
            body: formData,
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        setMessage(
          data.error ||
            "Inzending mislukt.",
        );
        return;
      }

      setMessage(
        data.needsReview
          ? "🟡 Inzending ontvangen. Phoenix controleert deze."
          : "🟢 Inzending automatisch gevalideerd!",
      );

      setScreenshot(null);
    } catch {
      setMessage(
        "Er kon geen verbinding met Phoenix worden gemaakt.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="rounded-xl border border-orange-400/15 bg-orange-500/[0.04] px-3 py-2">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-orange-300/60">
          Gekozen army
        </p>

        <p className="mt-1 text-xs font-black text-white">
          {difficulty.replaceAll(
            "_",
            " ",
          )}
        </p>
      </div>

      <label className="block cursor-pointer rounded-xl border border-dashed border-white/15 bg-black/20 px-4 py-5 text-center transition hover:border-orange-400/30">
        <span className="text-sm font-semibold">
          📸 Screenshot uploaden
        </span>

        <span className="mt-1 block text-[10px] text-white/30">
          Upload een screenshot waarop de Clash-naam rechtsboven zichtbaar is.
        </span>

        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) =>
            setScreenshot(
              event.target.files?.[0] ??
                null,
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
