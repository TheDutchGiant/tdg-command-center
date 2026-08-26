"use client";

import { useState } from "react";

type Mode =
  | "ALL"
  | "APPLIED";

type Player = {
  playerTag: string;
  name: string;
  townHall: number;
  availability:
    | "FULL"
    | "LIMITED"
    | null;
  applied: boolean;
  stars: number;
  attacks: number;
  missedAttacks: number;
  defenceStars: number;
  defensiveStrength: number;
  defensiveStrengthOverride: boolean;
  starsPerAttack: number;
  difficultyBonus: number;
  lastCwlClan: string | null;
  score: number;
  warning: string | null;

  regularWarScore: number;
  regularWarCount: number;
  regularWarAttacks: Array<{
    warTag: string;
    attackNumber: number;
    attackerTownHall: number;
    defenderName: string;
    defenderTownHall: number;
    stars: number;
    destruction: number;
    score: number;
  }>;

  position: number;
  role:
    | "STARTER"
    | "RESERVE";
};

type Clan = {
  name: string;
  tag: string;
  format:
    | "V15"
    | "V30";
  starters: number;
  minReserves: number;
  maxReserves: number;
  overflow: boolean;
  players: Player[];
};

type Proposal = {
  success: boolean;
  season: string;
  mode: Mode;
  totalCandidates: number;
  clans: Clan[];
  unassigned: Player[];
  error?: string;
};

export default function CwlProposalGenerator() {
  const [loading, setLoading] =
    useState<Mode | null>(null);

  const [proposal, setProposal] =
    useState<Proposal | null>(null);

  const [error, setError] =
    useState("");

  const [overrideLoading, setOverrideLoading] =
    useState<string | null>(null);

  const [manualAdding, setManualAdding] =
    useState<string | null>(null);

  async function generate(
    mode: Mode
  ) {
    setLoading(mode);
    setError("");
    setProposal(null);

    try {
      const response =
        await fetch(
          "/api/admin/cwl/generate",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              mode,
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
            "Voorstel genereren is mislukt."
        );
        return;
      }

      const draftResponse = await fetch(
        "/api/admin/cwl/draft",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      const draftData =
        await draftResponse.json();

      if (
        !draftResponse.ok ||
        !draftData.success
      ) {
        setError(
          draftData.error ||
            "Voorstel kon niet als concept worden opgeslagen."
        );
        return;
      }

      window.location.reload();
    } catch {
      setError(
        "Er kon geen verbinding met Phoenix worden gemaakt."
      );
    } finally {
      setLoading(null);
    }
  }

  async function toggleDefensiveOverride(
    clanTag: string,
    playerTag: string,
    enabled: boolean
  ) {
    const key =
      `${clanTag}:${playerTag}`;

    setOverrideLoading(key);
    setError("");

    try {
      const response =
        await fetch(
          "/api/admin/cwl/defensive-strength/override",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              clanTag,
              playerTag,
              action: enabled
                ? "MAX"
                : "REMOVE",
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
            "Defensive Strength override kon niet worden aangepast."
        );
        return;
      }

      await generate(
        proposal?.mode || "ALL"
      );
    } catch {
      setError(
        "Defensive Strength override kon niet worden aangepast."
      );
    } finally {
      setOverrideLoading(null);
    }
  }

  async function manuallyAddPlayer(
    player: Player,
    clan: Clan
  ) {
    const key =
      `${player.playerTag}:${clan.tag}`;

    setManualAdding(key);
    setError("");

    try {
      const response =
        await fetch(
          "/api/admin/cwl/draft/add",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                playerTag:
                  player.playerTag,
                name:
                  player.name,
                townHall:
                  player.townHall,
                availability:
                  player.availability,
                score:
                  player.score,
                stars:
                  player.stars,
                attacks:
                  player.attacks,
                missedAttacks:
                  player.missedAttacks,
                difficultyBonus:
                  player.difficultyBonus,
                defenceStars:
                  player.defenceStars,
                targetClanTag:
                  clan.tag,
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
            "Speler kon niet handmatig worden toegevoegd."
        );
        return;
      }

      /*
       * De draft editor en generator moeten de
       * nieuwe MANUAL assignment direct tonen.
       */
      window.location.reload();
    } catch {
      setError(
        "Er kon geen verbinding met Phoenix worden gemaakt."
      );
    } finally {
      setManualAdding(null);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-orange-400/15 bg-orange-500/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">
            🧠 CWL-generator
          </h2>

          <p className="mt-1 text-[9px] text-white/35">
            Genereer een nieuwe automatische CWL-indeling.
          </p>
        </div>

        {loading && (
          <span className="shrink-0 text-[9px] text-white/40">
            🧠 Berekenen...
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() =>
            generate("ALL")
          }
          disabled={loading !== null}
          className="rounded-lg border border-orange-400/20 bg-orange-500/10 px-3 py-2.5 text-left transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="block text-xs font-bold text-orange-200">
            🧠 Alle TDG-leden
          </span>

          <span className="mt-0.5 block text-[9px] text-white/35">
            Gebruik alle actuele leden.
          </span>
        </button>

        <button
          type="button"
          onClick={() =>
            generate("APPLIED")
          }
          disabled={loading !== null}
          className="rounded-lg border border-green-400/20 bg-green-500/10 px-3 py-2.5 text-left transition hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="block text-xs font-bold text-green-200">
            📝 Alleen aangemeld
          </span>

          <span className="mt-0.5 block text-[9px] text-white/35">
            Alleen goedgekeurde aanmeldingen.
          </span>
        </button>
      </div>

      {error && (
        <div className="mt-2 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-[10px] text-red-200">
          ❌ {error}
        </div>
      )}
    </section>
  );
}
