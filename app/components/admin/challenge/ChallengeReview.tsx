"use client";

import { useEffect, useState } from "react";

type Candidate = {
  playerTag: string;
  currentName: string;
  score: number;
};

type ReviewEntry = {
  id: number;
  challengeId: number;
  playerName: string;
  difficulty: string;
  screenshotPath: string | null;
  ocrResult: unknown;
  adminNote: string | null;
  submittedAt: string;
  challenge: {
    id: number;
    title: string;
    startsAt: string;
    endsAt: string;
    status: string;
  };
  candidates: Candidate[];
};

const difficultyLabels: Record<
  string,
  string
> = {
  EASY: "🟢 Easy",
  MEDIUM: "🟡 Medium",
  HARD: "🔴 Hard",
};

export default function ChallengeReview() {
  const [entries, setEntries] =
    useState<ReviewEntry[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [processingId, setProcessingId] =
    useState<number | null>(null);
  const [selectedPlayers, setSelectedPlayers] =
    useState<Record<number, string>>({});
  const [message, setMessage] =
    useState("");

  async function loadEntries() {
    try {
      setLoading(true);

      const response = await fetch(
        "/api/admin/challenge/review",
        {
          cache: "no-store",
        },
      );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Inzendingen konden niet worden geladen.",
        );
      }

      setEntries(
        Array.isArray(data.entries)
          ? data.entries
          : [],
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `❌ ${error.message}`
          : "❌ Inzendingen konden niet worden geladen.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEntries();
  }, []);

  async function reviewEntry(
    entryId: number,
    action: "APPROVE" | "REJECT",
  ) {
    if (processingId !== null) {
      return;
    }

    const playerTag =
      selectedPlayers[entryId] || "";

    if (
      action === "APPROVE" &&
      !playerTag
    ) {
      setMessage(
        "⚠️ Kies eerst de juiste speler.",
      );
      return;
    }

    const confirmed =
      window.confirm(
        action === "APPROVE"
          ? "Deze inzending goedkeuren en aan de gekozen speler koppelen?"
          : "Deze inzending definitief afwijzen?",
      );

    if (!confirmed) {
      return;
    }

    setProcessingId(entryId);
    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/challenge/review",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            entryId,
            action,
            playerTag:
              action === "APPROVE"
                ? playerTag
                : undefined,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "De inzending kon niet worden verwerkt.",
        );
      }

      setMessage(
        action === "APPROVE"
          ? "✅ Inzending goedgekeurd en gekoppeld."
          : "✅ Inzending afgewezen.",
      );

      await loadEntries();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `❌ ${error.message}`
          : "❌ De inzending kon niet worden verwerkt.",
      );
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-yellow-400/20 bg-yellow-500/[0.04] p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            🟡 Inzendingen ter controle
          </h2>

          <p className="mt-1 text-sm text-white/50">
            Phoenix kon deze inzendingen niet
            eenduidig aan één account koppelen.
            Controleer het screenshot en kies de
            juiste speler.
          </p>
        </div>

        <div className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-200">
          {entries.length} openstaand
        </div>
      </div>

      {message && (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
          {message}
        </div>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-white/40">
          Controles laden...
        </p>
      ) : entries.length === 0 ? (
        <div className="mt-6 rounded-xl border border-white/10 bg-black/20 px-4 py-8 text-center text-sm text-white/35">
          🎉 Geen inzendingen die op
          controle wachten.
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {entries.map((entry) => {
            const selectedPlayer =
              selectedPlayers[entry.id] ||
              "";

            return (
              <article
                key={entry.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-black/25"
              >
                <div className="border-b border-white/10 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white/60">
                      {difficultyLabels[
                        entry.difficulty
                      ] ||
                        entry.difficulty}
                    </span>

                    <span className="text-xs text-white/30">
                      {entry.challenge.title}
                    </span>

                    <span className="text-xs text-white/20">
                      •
                    </span>

                    <span className="text-xs text-white/30">
                      {new Date(
                        entry.submittedAt,
                      ).toLocaleString(
                        "nl-NL",
                      )}
                    </span>
                  </div>
                </div>

                <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                  <div>
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.15em] text-white/25">
                      Origineel screenshot
                    </p>

                    {entry.screenshotPath ? (
                      <a
                        href={
                          entry.screenshotPath
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="block overflow-hidden rounded-xl border border-white/10 bg-black/40"
                      >
                        <img
                          src={
                            entry.screenshotPath
                          }
                          alt={`Challenge screenshot ${entry.playerName}`}
                          className="max-h-[520px] w-full object-contain"
                        />
                      </a>
                    ) : (
                      <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-red-400/20 bg-red-500/[0.04] text-sm text-red-200/60">
                        Geen screenshot beschikbaar.
                      </div>
                    )}

                    <p className="mt-2 text-[10px] text-white/20">
                      Klik op de afbeelding om
                      het volledige originele
                      screenshot te openen.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/25">
                        OCR
                      </p>

                      <p className="mt-2 text-sm font-bold">
                        {entry.playerName ||
                          "Geen naam gevonden"}
                      </p>

                      {entry.adminNote && (
                        <p className="mt-2 text-xs leading-5 text-yellow-200/60">
                          {entry.adminNote}
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/25">
                        Mogelijke accounts
                      </p>

                      {entry.candidates.length ===
                      0 ? (
                        <p className="mt-3 text-xs text-white/35">
                          Phoenix heeft geen
                          betrouwbare kandidaten
                          gevonden.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {entry.candidates.map(
                            (candidate) => (
                              <label
                                key={
                                  candidate.playerTag
                                }
                                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 transition ${
                                  selectedPlayer ===
                                  candidate.playerTag
                                    ? "border-orange-300/40 bg-orange-500/10"
                                    : "border-white/10 bg-black/20 hover:border-white/20"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`player-${entry.id}`}
                                  value={
                                    candidate.playerTag
                                  }
                                  checked={
                                    selectedPlayer ===
                                    candidate.playerTag
                                  }
                                  onChange={() =>
                                    setSelectedPlayers(
                                      (
                                        current,
                                      ) => ({
                                        ...current,
                                        [entry.id]:
                                          candidate.playerTag,
                                      }),
                                    )
                                  }
                                  className="accent-orange-500"
                                />

                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-bold">
                                    {
                                      candidate.currentName
                                    }
                                  </span>

                                  <span className="block truncate text-[10px] text-white/25">
                                    {
                                      candidate.playerTag
                                    }
                                  </span>
                                </span>

                                <span className="text-[10px] font-bold text-white/30">
                                  {Math.round(
                                    candidate.score *
                                      100,
                                  )}
                                  %
                                </span>
                              </label>
                            ),
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        disabled={
                          processingId !== null
                        }
                        onClick={() =>
                          reviewEntry(
                            entry.id,
                            "APPROVE",
                          )
                        }
                        className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {processingId ===
                        entry.id
                          ? "⏳ Bezig..."
                          : "✅ Goedkeuren & koppelen"}
                      </button>

                      <button
                        type="button"
                        disabled={
                          processingId !== null
                        }
                        onClick={() =>
                          reviewEntry(
                            entry.id,
                            "REJECT",
                          )
                        }
                        className="rounded-xl border border-red-400/20 bg-red-500/[0.06] px-4 py-3 text-sm font-bold text-red-200 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        ❌ Afwijzen
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
