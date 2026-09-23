"use client";

import { FormEvent, useState } from "react";
import PublicClanNavigation from "@/app/components/PublicClanNavigation";

type PlayerData = {
  tag: string;
  name: string;
  townHallLevel: number;
  clan: {
    tag: string;
    name: string;
  } | null;
};

export default function CwlApplicationPage() {
  const [playerTag, setPlayerTag] =
    useState("");

  const [player, setPlayer] =
    useState<PlayerData | null>(null);

  const [availability, setAvailability] =
    useState<"FULL" | "LIMITED">("FULL");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [lookupLoading, setLookupLoading] =
    useState(false);

  const [submitLoading, setSubmitLoading] =
    useState(false);

  async function handleLookup() {
    setMessage("");
    setError("");
    setPlayer(null);

    const tag =
      playerTag.trim().toUpperCase();

    if (!tag) {
      setError(
        "Vul eerst je Player ID in."
      );
      return;
    }

    setLookupLoading(true);

    try {
      const response = await fetch(
        "/api/cwl/player",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            playerTag: tag,
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
            "Speler kon niet worden gevonden."
        );
        return;
      }

      setPlayer(data.player);
      setPlayerTag(data.player.tag);
    } catch {
      setError(
        "Er kon geen verbinding met Phoenix worden gemaakt."
      );
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!player) {
      setError(
        "Controleer eerst je Player ID."
      );
      return;
    }

    setSubmitLoading(true);

    try {
      const response = await fetch(
        "/api/cwl/apply",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            playerTag: player.tag,
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
      setSubmitLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-xl">

        <PublicClanNavigation />

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

            {/* Player ID */}
            <div>
              <label
                htmlFor="playerTag"
                className="mb-1.5 block text-xs font-semibold"
              >
                Player ID
              </label>

              <div className="flex gap-2">
                <input
                  id="playerTag"
                  type="text"
                  value={playerTag}
                  onChange={(event) => {
                    setPlayerTag(
                      event.target.value.toUpperCase()
                    );
                    setPlayer(null);
                    setError("");
                    setMessage("");
                  }}
                  required
                  placeholder="#ABC123"
                  disabled={
                    lookupLoading ||
                    submitLoading
                  }
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 font-mono text-sm uppercase outline-none transition focus:border-orange-400/60 disabled:opacity-50"
                />

                <button
                  type="button"
                  onClick={handleLookup}
                  disabled={
                    lookupLoading ||
                    submitLoading ||
                    !playerTag.trim()
                  }
                  className="rounded-xl bg-orange-500 px-4 py-3 text-xs font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {lookupLoading
                    ? "Zoeken..."
                    : "🔎 Controleren"}
                </button>
              </div>

              <p className="mt-1 text-[10px] text-white/30">
                Plak hier je Player ID uit
                Clash of Clans.
              </p>
            </div>

            {/* Player confirmation */}
            {player && (
              <div className="rounded-xl border border-green-400/30 bg-green-500/10 p-4">

                <p className="text-xs font-semibold text-green-300">
                  ✅ Speler gevonden
                </p>

                <div className="mt-3">
                  <p className="text-lg font-bold text-white">
                    {player.name}
                  </p>

                  <p className="mt-1 text-xs text-white/50">
                    {player.tag}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs font-semibold">
                      🏰 TH{player.townHallLevel}
                    </span>

                    {player.clan && (
                      <span className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs font-semibold">
                        🛡️ {player.clan.name}
                      </span>
                    )}

                    {!player.clan && (
                      <span className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs text-white/50">
                        Geen clan
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-xs text-white/60">
                    Ben jij dit? Controleer de
                    gegevens hierboven voordat je
                    je aanmeldt.
                  </p>
                </div>

              </div>
            )}

            {/* Availability */}
            {player && (
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
                    disabled={submitLoading}
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
                    disabled={submitLoading}
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
            )}

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

            {/* Submit */}
            {player && (
              <button
                type="submit"
                disabled={submitLoading}
                className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitLoading
                  ? "Aanmelding opslaan..."
                  : "🏆 Aanmelden voor CWL"}
              </button>
            )}

          </form>

        </section>

        <p className="mt-4 text-center text-[10px] text-white/25">
          TDG Phoenix • CWL Selection System
        </p>

      </div>
    </main>
  );
}
