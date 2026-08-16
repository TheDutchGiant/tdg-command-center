"use client";

import { FormEvent, useState } from "react";

export default function CwlApplicationPage() {
  const [clashName, setClashName] =
    useState("");

  const [playerTag, setPlayerTag] =
    useState("");

  const [availability, setAvailability] =
    useState<"FULL" | "LIMITED">("FULL");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        "/api/cwl/apply",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clashName,
            playerTag,
            availability,
          }),
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        setError(
          data.error ||
            "Aanmelden is mislukt."
        );
        return;
      }

      setMessage(
        "✅ Je CWL-aanmelding is opgeslagen!"
      );
    } catch {
      setError(
        "Er kon geen verbinding met Phoenix worden gemaakt."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-xl">

        <header className="mb-6 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-orange-300">
            🏆 TDG Phoenix
          </p>

          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
            CWL Aanmelden
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm text-white/45">
            Meld je aan voor de komende CWL
            binnen de TDG Family.
          </p>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >

            <div>
              <label
                htmlFor="clashName"
                className="mb-1.5 block text-xs font-semibold"
              >
                Clash naam
              </label>

              <input
                id="clashName"
                type="text"
                value={clashName}
                onChange={(event) =>
                  setClashName(
                    event.target.value
                  )
                }
                required
                placeholder="Bijvoorbeeld Maarten"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 text-sm outline-none transition focus:border-orange-400/60"
              />
            </div>

            <div>
              <label
                htmlFor="playerTag"
                className="mb-1.5 block text-xs font-semibold"
              >
                Player tag
              </label>

              <input
                id="playerTag"
                type="text"
                value={playerTag}
                onChange={(event) =>
                  setPlayerTag(
                    event.target.value.toUpperCase()
                  )
                }
                required
                placeholder="#ABC123"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 font-mono text-sm uppercase outline-none transition focus:border-orange-400/60"
              />

              <p className="mt-1 text-[10px] text-white/30">
                Je vindt je player tag onder
                je Clash of Clans-profiel.
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold">
                📅 Beschikbaarheid
              </p>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">

                <button
                  type="button"
                  onClick={() =>
                    setAvailability("FULL")
                  }
                  className={`rounded-xl border px-3 py-3 text-left transition ${
                    availability === "FULL"
                      ? "border-green-400/50 bg-green-500/10"
                      : "border-white/10 bg-black/20 hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="block text-sm font-semibold">
                    🟢 Volledig beschikbaar
                  </span>

                  <span className="mt-1 block text-[10px] text-white/35">
                    Alle CWL-dagen beschikbaar.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setAvailability("LIMITED")
                  }
                  className={`rounded-xl border px-3 py-3 text-left transition ${
                    availability === "LIMITED"
                      ? "border-yellow-400/50 bg-yellow-500/10"
                      : "border-white/10 bg-black/20 hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="block text-sm font-semibold">
                    🟡 Beperkt beschikbaar
                  </span>

                  <span className="mt-1 block text-[10px] text-white/35">
                    Niet alle CWL-dagen beschikbaar.
                  </span>
                </button>

              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-200">
                ❌ {error}
              </div>
            )}

            {message && (
              <div className="rounded-xl border border-green-400/20 bg-green-500/10 px-3 py-2.5 text-xs text-green-200">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Aanmelding controleren..."
                : "🏆 Aanmelden voor CWL"}
            </button>

          </form>

        </section>

        <p className="mt-4 text-center text-[10px] text-white/25">
          TDG Phoenix • CWL Selection System
        </p>

      </div>
    </main>
  );
}