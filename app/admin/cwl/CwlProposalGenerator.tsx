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

      setProposal(data);
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
    <section className="mt-6 rounded-xl border border-orange-400/15 bg-orange-500/[0.03] p-4">

      <div className="mb-4">
        <h2 className="text-sm font-semibold">
          🧠 CWL voorstelgenerator
        </h2>

        <p className="mt-1 text-[10px] leading-5 text-white/35">
          Laat Phoenix een competitief voorstel
          maken. Een voorstel wordt nog niet
          definitief opgeslagen.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">

        <button
          type="button"
          onClick={() =>
            generate("ALL")
          }
          disabled={loading !== null}
          className="rounded-lg border border-orange-400/20 bg-orange-500/10 px-3 py-3 text-left transition hover:bg-orange-500/20 disabled:opacity-50"
        >
          <span className="block text-xs font-bold text-orange-200">
            🧠 Alle TDG-leden
          </span>

          <span className="mt-1 block text-[10px] text-white/35">
            Gebruik alle actuele leden als
            selectiepool.
          </span>
        </button>

        <button
          type="button"
          onClick={() =>
            generate("APPLIED")
          }
          disabled={loading !== null}
          className="rounded-lg border border-green-400/20 bg-green-500/10 px-3 py-3 text-left transition hover:bg-green-500/20 disabled:opacity-50"
        >
          <span className="block text-xs font-bold text-green-200">
            📝 Alleen aangemeld
          </span>

          <span className="mt-1 block text-[10px] text-white/35">
            Alleen spelers die zich hebben
            aangemeld.
          </span>
        </button>

      </div>

      {loading && (
        <div className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/50">
          🧠 Phoenix berekent het voorstel...
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          ❌ {error}
        </div>
      )}

      {proposal && (
        <div className="mt-5">

          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold">
                🏆 Voorstel
              </h3>

              <p className="text-[10px] text-white/35">
                {proposal.mode ===
                "ALL"
                  ? "Alle actuele TDG-leden"
                  : "Alleen aangemelde spelers"}
                {" • "}
                {proposal.totalCandidates}
                {" kandidaten"}
              </p>
            </div>

            <span className="rounded-md border border-orange-400/20 bg-orange-500/10 px-2 py-1 text-[9px] font-bold text-orange-200">
              VOORSTEL
            </span>
          </div>

          <div className="space-y-3">
            {proposal.clans.map(
              (clan) => (
                <ClanProposal
                  key={clan.name}
                  clan={clan}
                  overrideLoading={
                    overrideLoading
                  }
                  onToggleOverride={
                    toggleDefensiveOverride
                  }
                />
              )
            )}
          </div>

          <section className="mt-4 rounded-lg border border-yellow-400/20 bg-yellow-500/[0.04] p-3">
              <h4 className="text-xs font-bold text-yellow-200">
                ⚠️ Niet geplaatst
              </h4>

              <p className="mt-1 text-[10px] text-white/35">
                Deze spelers konden automatisch niet worden geplaatst.
                Een admin kan bewust een clan kiezen als override.
              </p>

              {proposal.unassigned.length === 0 ? (
                <div className="mt-2 rounded-md border border-white/10 bg-black/20 p-3 text-[10px] text-white/30">
                  Alle aangemelde spelers zijn automatisch geplaatst.
                </div>
              ) : (
                <div className="mt-2 space-y-1.5">
                  {proposal.unassigned.map(
                  (player) => (
                    <div
                      key={
                        player.playerTag
                      }
                      className="rounded-md border border-white/10 bg-black/20 p-2"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-[10px] font-semibold">
                          {player.name}
                        </span>

                        <span className="shrink-0 rounded bg-purple-500/10 px-1.5 py-0.5 text-[8px] font-bold text-purple-300">
                          TH{player.townHall}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1">
                        {proposal.clans.map(
                          (clan) => {
                            const key =
                              `${player.playerTag}:${clan.tag}`;

                            const busy =
                              manualAdding ===
                              key;

                            return (
                              <button
                                key={
                                  clan.tag
                                }
                                type="button"
                                disabled={
                                  manualAdding !==
                                  null
                                }
                                onClick={() =>
                                  manuallyAddPlayer(
                                    player,
                                    clan
                                  )
                                }
                                className="rounded-md border border-cyan-400/20 bg-cyan-500/10 px-2 py-1 text-[8px] font-bold text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {busy
                                  ? "Toevoegen..."
                                  : `➕ ${clan.name}`}
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )
                  )}
                </div>
              )}
            </section>

        </div>
      )}

    </section>
  );
}

function ClanProposal({
  clan,
  overrideLoading,
  onToggleOverride,
}: {
  clan: Clan;
  overrideLoading: string | null;
  onToggleOverride: (
    clanTag: string,
    playerTag: string,
    enabled: boolean
  ) => void;
}) {
  const starters =
    clan.players.filter(
      (player) =>
        player.role ===
        "STARTER"
    );

  const reserves =
    clan.players.filter(
      (player) =>
        player.role ===
        "RESERVE"
    );

  return (
    <section className="rounded-lg border border-white/10 bg-black/20 p-3">

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-xs font-bold">
            {clan.name}
          </h4>

          <p className="text-[9px] text-white/30">
            {clan.format === "V15"
              ? "15v15"
              : "30v30"}
            {" • "}
            {clan.players.length}
            {" spelers"}
          </p>
        </div>

        {clan.overflow && (
          <span className="w-fit rounded-md border border-yellow-400/20 bg-yellow-500/10 px-2 py-1 text-[9px] font-bold text-yellow-200">
            ⚠️ Extra spelers
          </span>
        )}
      </div>

      <PlayerGroup
        title="Starters"
        players={starters}
        clanTag={clan.tag}
        overrideLoading={
          overrideLoading
        }
        onToggleOverride={
          onToggleOverride
        }
      />

      {reserves.length >
        0 && (
        <PlayerGroup
          title="Reserves"
          players={reserves}
          clanTag={clan.tag}
          overrideLoading={
            overrideLoading
          }
          onToggleOverride={
            onToggleOverride
          }
        />
      )}

    </section>
  );
}

function PlayerGroup({
  title,
  players,
  clanTag,
  overrideLoading,
  onToggleOverride,
}: {
  title: string;
  players: Player[];
  clanTag: string;
  overrideLoading: string | null;
  onToggleOverride: (
    clanTag: string,
    playerTag: string,
    enabled: boolean
  ) => void;
}) {
  const [expandedPlayer, setExpandedPlayer] =
    useState<string | null>(null);

  return (
    <div className="mt-3">
      <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-white/30">
        {title} ({players.length})
      </p>

      <div className="space-y-1">
        {players.map(
          (player) => {
            const expanded =
              expandedPlayer ===
              player.playerTag;

            return (
              <div
                key={
                  player.playerTag
                }
                className="overflow-hidden rounded-md border border-white/10 bg-white/[0.02]"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedPlayer(
                      expanded
                        ? null
                        : player.playerTag
                    )
                  }
                  className="w-full px-2.5 py-2 text-left transition hover:bg-white/[0.04]"
                >
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">

                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-white/40">
                        #{player.position}
                      </span>

                      <span className="text-xs font-semibold">
                        {player.name}
                      </span>

                      <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[8px] font-bold text-purple-300">
                        TH{player.townHall}
                      </span>

                      {player.availability ===
                        "FULL" && (
                        <span className="text-[9px] text-green-300">
                          🟢
                        </span>
                      )}

                      {player.availability ===
                        "LIMITED" && (
                        <span className="text-[9px] text-yellow-300">
                          🟡
                        </span>
                      )}

                      <span className="text-[10px] text-white/25">
                        {expanded
                          ? "▲"
                          : "▼"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[9px] text-white/40">
                      <span>
                        ⚔️ {player.attacks}
                      </span>

                      <span>
                        ❌{" "}
                        {player.missedAttacks}
                      </span>

                      <span className="font-semibold text-cyan-300/80">
                        🛡️ DS{" "}
                        {player.defensiveStrength}
                      </span>

                      <span className="font-bold text-white">
                        {player.score}
                      </span>
                    </div>

                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-white/10 bg-black/20 p-3">

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">

                      <div className="rounded-md border border-white/10 bg-white/[0.02] p-2">
                        <span className="block text-[8px] uppercase tracking-wider text-white/30">
                          Regular CW
                        </span>
                        <span className="mt-1 block text-sm font-bold text-orange-200">
                          {player.regularWarScore}
                        </span>
                      </div>

                      <div className="rounded-md border border-white/10 bg-white/[0.02] p-2">
                        <span className="block text-[8px] uppercase tracking-wider text-white/30">
                          CW's
                        </span>
                        <span className="mt-1 block text-sm font-bold">
                          {player.regularWarCount}
                        </span>
                      </div>

                      <div className="rounded-md border border-white/10 bg-white/[0.02] p-2">
                        <span className="block text-[8px] uppercase tracking-wider text-white/30">
                          Gemist
                        </span>
                        <span className="mt-1 block text-sm font-bold text-red-300">
                          {player.missedAttacks}
                        </span>
                      </div>

                      <div className="rounded-md border border-white/10 bg-white/[0.02] p-2">
                        <span className="block text-[8px] uppercase tracking-wider text-white/30">
                          Totaal
                        </span>
                        <span className="mt-1 block text-sm font-bold text-cyan-200">
                          {player.score}
                        </span>
                      </div>

                    </div>

                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-white/30">
                          ⚔️ Gewone CW aanvallen
                        </span>

                        <span className="text-[9px] text-white/25">
                          {player.regularWarAttacks.length}
                          {" aanvallen"}
                        </span>
                      </div>

                      {player.regularWarAttacks.length ===
                      0 ? (
                        <div className="rounded-md border border-white/10 bg-white/[0.02] p-3 text-[10px] text-white/30">
                          Geen individuele gewone-CW aanvallen beschikbaar.
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {player.regularWarAttacks.map(
                            (attack) => (
                              <div
                                key={`${attack.warTag}-${attack.attackNumber}`}
                                className="rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-2"
                              >
                                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">

                                  <div className="flex flex-wrap items-center gap-2 text-[10px]">
                                    <span className="text-white/30">
                                      #{attack.attackNumber}
                                    </span>

                                    <span>
                                      TH{attack.attackerTownHall}
                                    </span>

                                    <span className="text-white/25">
                                      →
                                    </span>

                                    <span>
                                      TH{attack.defenderTownHall}
                                    </span>

                                    <span className="text-white/50">
                                      {attack.defenderName ||
                                        "Onbekende verdediger"}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-3 text-[9px]">
                                    <span>
                                      {"⭐".repeat(
                                        Math.max(
                                          0,
                                          Math.min(
                                            3,
                                            attack.stars
                                          )
                                        )
                                      )}
                                    </span>

                                    <span className="text-white/30">
                                      {attack.destruction}%
                                    </span>

                                    <span className="font-bold text-orange-200">
                                      +{attack.score}
                                    </span>
                                  </div>

                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )}

                    </div>

                    {player.missedAttacks > 0 && (
                      <div className="mt-3 rounded-md border border-red-400/15 bg-red-500/[0.04] p-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-red-200">
                            ❌ Gemiste gewone-CW aanvallen
                          </span>

                          <span className="text-[10px] font-bold text-red-300">
                            {player.missedAttacks}
                            {" × -1500"}
                          </span>
                        </div>

                        <p className="mt-1 text-[9px] text-white/30">
                          Gemiste aanvallen worden rechtstreeks
                          in de Regular CW-score verwerkt.
                        </p>
                      </div>
                    )}

                    <div className="mt-4 border-t border-white/10 pt-3">

                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-white/35">
                          Regular CW performance
                        </span>

                        <span className="font-semibold text-orange-200">
                          {player.regularWarScore}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center justify-between text-[10px]">
                        <span className="text-white/35">
                          Defensive Strength
                        </span>

                        <span className="font-semibold text-cyan-300">
                          +{player.defensiveStrength}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between rounded-md border border-orange-400/15 bg-orange-500/[0.04] px-2.5 py-2">
                        <span className="text-[10px] font-bold text-white/60">
                          TOTAAL
                        </span>

                        <span className="text-sm font-black text-orange-200">
                          {player.score}
                        </span>
                      </div>

                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-[9px] text-white/25">
                        {player.defensiveStrengthOverride
                          ? "Handmatige DS override actief"
                          : player.townHall >= 19
                            ? "Automatische DS — TH19+"
                            : "Automatische DS"}
                      </span>

                      {player.townHall <
                        19 && (
                        <button
                          type="button"
                          onClick={() =>
                            onToggleOverride(
                              clanTag,
                              player.playerTag,
                              !player.defensiveStrengthOverride
                            )
                          }
                          disabled={
                            overrideLoading ===
                            `${clanTag}:${player.playerTag}`
                          }
                          className={
                            player.defensiveStrengthOverride
                              ? "rounded-md border border-red-400/20 bg-red-500/10 px-2 py-1 text-[9px] font-bold text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
                              : "rounded-md border border-cyan-400/20 bg-cyan-500/10 px-2 py-1 text-[9px] font-bold text-cyan-200 transition hover:bg-cyan-500/20 disabled:opacity-50"
                          }
                        >
                          {overrideLoading ===
                          `${clanTag}:${player.playerTag}`
                            ? "Bezig..."
                            : player.defensiveStrengthOverride
                              ? "↩ Automatische DS"
                              : "🛡️ DS MAX"}
                        </button>
                      )}
                    </div>

                    {player.warning && (
                      <p className="mt-2 text-[9px] text-yellow-300/80">
                        {player.warning}
                      </p>
                    )}

                  </div>
                )}
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}