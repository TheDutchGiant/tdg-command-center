"use client";

import { useEffect, useState } from "react";

type Player = {
  id: number;
  playerTag: string;
  name: string;
  position: number;
  score: number;
  townHall: number | null;
};

type Clan = {
  id: number;
  clanTag: string;
  clanName: string;
  format: "V15" | "V30";
  players: Player[];
};

type Draft = {
  id: number;
  season: string;
  status: "DRAFT" | "FINAL";
  version: number;
  clans: Clan[];
};

export default function CwlDraftEditor() {
  const [draft, setDraft] =
    useState<Draft | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [movingPlayer, setMovingPlayer] =
    useState<string | null>(null);

  const [targetClan, setTargetClan] =
    useState<number | null>(null);

  const [targetPosition, setTargetPosition] =
    useState(1);

  const [moving, setMoving] =
    useState(false);

  useEffect(() => {
    async function load() {
      try {
        const response =
          await fetch(
            "/api/admin/cwl/draft/current"
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          setError(
            data.error ||
              "Concept kon niet worden geladen."
          );
          return;
        }

        setDraft(data.plan);
      } catch {
        setError(
          "Concept kon niet worden geladen."
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-white/40">
        🧠 CWL-concept laden...
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-6 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-xs text-red-200">
        ❌ {error}
      </section>
    );
  }

  if (!draft) {
    return (
      <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-white/40">
        Nog geen CWL-concept opgeslagen.
      </section>
    );
  }

  async function movePlayer() {
    if (
      !movingPlayer ||
      !targetClan
    ) {
      return;
    }

    setMoving(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/admin/cwl/draft/move",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              playerTag:
                movingPlayer,
              targetClanPlanId:
                targetClan,
              targetPosition,
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
            "Speler kon niet worden verplaatst."
        );
        return;
      }

      setMovingPlayer(null);
      setTargetClan(null);
      setTargetPosition(1);

      const refresh =
        await fetch(
          "/api/admin/cwl/draft/current",
          {
            cache: "no-store",
          }
        );

      const refreshed =
        await refresh.json();

      if (
        refresh.ok &&
        refreshed.success
      ) {
        setDraft(refreshed.plan);
      }
    } catch {
      setError(
        "Speler kon niet worden verplaatst."
      );
    } finally {
      setMoving(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-cyan-400/15 bg-cyan-500/[0.03] p-4">

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold">
            ✏️ CWL-indeling bewerken
          </h2>

          <p className="mt-1 text-[10px] text-white/35">
            Concept v{draft.version} •{" "}
            {draft.status}
          </p>
        </div>

        <span className="rounded-md border border-cyan-400/20 bg-cyan-500/10 px-2 py-1 text-[9px] font-bold text-cyan-200">
          DRAFT
        </span>
      </div>

      <div className="space-y-3">
        {draft.clans.map((clan) => (
          <section
            key={clan.id}
            className="rounded-lg border border-white/10 bg-black/20 p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold">
                  {clan.clanName}
                </h3>

                <p className="text-[9px] text-white/30">
                  {clan.format === "V30"
                    ? "30v30"
                    : "15v15"}{" "}
                  • {clan.players.length} spelers
                </p>
              </div>
            </div>

            <div className="space-y-1">
              {clan.players.map((player) => (
                <div
                  key={player.id}
                  className="rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="w-5 text-[9px] font-bold text-white/30">
                        {player.position}
                      </span>

                      <span className="truncate text-xs font-semibold">
                        {player.name}
                      </span>

                      {player.townHall && (
                        <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[8px] font-bold text-purple-300">
                          TH{player.townHall}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-orange-200">
                        {player.score}
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setMovingPlayer(
                            player.playerTag
                          );
                          setTargetClan(clan.id);
                          setTargetPosition(
                            player.position
                          );
                        }}
                        className="rounded-md border border-cyan-400/20 bg-cyan-500/10 px-2 py-1 text-[9px] font-bold text-cyan-200 hover:bg-cyan-500/20"
                      >
                        ↔ Verplaatsen
                      </button>
                    </div>
                  </div>

                  {movingPlayer ===
                    player.playerTag && (
                    <div className="mt-2 flex flex-col gap-2 border-t border-white/10 pt-2 sm:flex-row sm:items-center">
                      <select
                        value={
                          targetClan ?? clan.id
                        }
                        onChange={(event) =>
                          setTargetClan(
                            Number(
                              event.target.value
                            )
                          )
                        }
                        className="rounded-md border border-white/10 bg-black px-2 py-1.5 text-[10px] text-white"
                      >
                        {draft.clans.map(
                          (target) => (
                            <option
                              key={target.id}
                              value={target.id}
                            >
                              {target.clanName}
                            </option>
                          )
                        )}
                      </select>

                      <select
                        value={targetPosition}
                        onChange={(event) =>
                          setTargetPosition(
                            Number(
                              event.target.value
                            )
                          )
                        }
                        className="rounded-md border border-white/10 bg-black px-2 py-1.5 text-[10px] text-white"
                      >
                        {Array.from(
                          {
                            length:
                              (draft.clans.find(
                                (item) =>
                                  item.id ===
                                  targetClan
                              )?.players.length ||
                                clan.players.length) +
                              1,
                          },
                          (_, index) => (
                            <option
                              key={index + 1}
                              value={index + 1}
                            >
                              Positie {index + 1}
                            </option>
                          )
                        )}
                      </select>

                      <button
                        type="button"
                        onClick={movePlayer}
                        disabled={moving}
                        className="rounded-md border border-green-400/20 bg-green-500/10 px-3 py-1.5 text-[9px] font-bold text-green-200 hover:bg-green-500/20 disabled:opacity-50"
                      >
                        {moving
                          ? "Opslaan..."
                          : "✓ Verplaats"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setMovingPlayer(null)
                        }
                        className="rounded-md border border-white/10 px-3 py-1.5 text-[9px] text-white/50 hover:bg-white/5"
                      >
                        Annuleren
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

    </section>
  );
}
