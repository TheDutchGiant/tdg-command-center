"use client";

import { useEffect, useState } from "react";

type Challenge = {
  id: number;
  title: string;
  startsAt: string;
  endsAt: string;
  baseId: number | null;
  sourceArmyName: string | null;
  variants: {
    difficulty: string;
    mutatedPercent: number;
  }[];
};

export default function ChallengeAdminPage() {
  const [challenge, setChallenge] =
    useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState("");

  async function loadChallenge() {
    try {
      const response = await fetch(
        "/api/admin/challenge/current",
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("Challenge kon niet worden geladen.");
      }

      const data = await response.json();

      if (data?.challenge) {
        setChallenge(data.challenge);
      }
    } catch {
      setMessage("Challenge kon niet worden geladen.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChallenge();
  }, []);

  async function startNewChallenge() {
    if (starting) return;

    const confirmed = window.confirm(
      "Weet je zeker dat je een nieuwe Challenge wilt starten?\n\n" +
        "De huidige Challenge vervalt direct en er wordt onmiddellijk " +
        "een nieuwe Base + Random Army gegenereerd."
    );

    if (!confirmed) return;

    setStarting(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/challenge/start",
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Nieuwe Challenge kon niet worden gestart."
        );
      }

      setMessage(
        "✅ Nieuwe Challenge is gestart."
      );

      await loadChallenge();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `❌ ${error.message}`
          : "❌ Nieuwe Challenge kon niet worden gestart."
      );
    } finally {
      setStarting(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-orange-300">
            🛡️ TDG Phoenix
          </p>

          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
            Random Army Challenge
          </h1>

          <p className="mt-2 text-sm text-white/50">
            Beheer van de actieve Challenge.
          </p>
        </header>

        <section className="rounded-2xl border border-orange-400/20 bg-orange-500/[0.05] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                ⚔️ Nieuwe Challenge starten
              </h2>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-white/50">
                Start direct een nieuwe Challenge met een nieuwe
                Base en drie nieuwe Random Army varianten.
                De Challenge loopt vervolgens 7 dagen.
              </p>
            </div>

            <button
              type="button"
              onClick={startNewChallenge}
              disabled={starting}
              className="shrink-0 rounded-xl border border-orange-400/30 bg-orange-500/15 px-5 py-3 text-sm font-bold text-orange-200 transition hover:border-orange-300/50 hover:bg-orange-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {starting
                ? "⏳ Bezig..."
                : "🚀 Start nieuwe Challenge"}
            </button>
          </div>

          {message && (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
              {message}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-sm font-semibold">
            📋 Actieve Challenge
          </h2>

          {loading ? (
            <p className="mt-4 text-sm text-white/40">
              Laden...
            </p>
          ) : challenge ? (
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-lg font-bold">
                  {challenge.title}
                </p>

                <p className="mt-1 text-xs text-white/40">
                  {new Date(
                    challenge.startsAt
                  ).toLocaleString("nl-NL")}{" "}
                  →{" "}
                  {new Date(
                    challenge.endsAt
                  ).toLocaleString("nl-NL")}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs text-white/35">
                    Base
                  </p>
                  <p className="mt-1 font-semibold">
                    {challenge.baseId
                      ? `Base #${challenge.baseId}`
                      : "Geen base gekoppeld"}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs text-white/35">
                    Off-Meta bron
                  </p>
                  <p className="mt-1 font-semibold">
                    {challenge.sourceArmyName ||
                      "Onbekend"}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs text-white/35">
                  Random Army varianten
                </p>

                <div className="grid gap-2 sm:grid-cols-3">
                  {challenge.variants.map(
                    (variant) => (
                      <div
                        key={variant.difficulty}
                        className="rounded-xl border border-white/10 bg-black/20 p-3"
                      >
                        <p className="text-xs font-semibold">
                          {variant.difficulty}
                        </p>

                        <p className="mt-1 text-sm text-orange-300">
                          {variant.mutatedPercent}%
                          gemuteerd
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-white/40">
              Geen actieve Challenge.
            </p>
          )}
        </section>

        <a
          href="/admin"
          className="mt-6 inline-block text-sm text-white/40 hover:text-orange-300"
        >
          ← Terug naar Admin Command Center
        </a>
      </div>
    </main>
  );
}
