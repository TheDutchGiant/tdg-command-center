"use client";

import { useEffect, useState } from "react";

type Player = {
  id: number;
  playerTag: string;
  name: string;
  position: number;
  score: number;
  missedAttacks: number;
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

export default function CwlDraftEditor({
  isSuperadmin,
}: {
  isSuperadmin: boolean;
}) {
  const [draft, setDraft] =
    useState<Draft | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [movingPlayer, setMovingPlayer] =
    useState<string | null>(null);

  const [targetPlayer, setTargetPlayer] =
    useState<string | null>(null);

  const [moving, setMoving] =
    useState(false);

  const [finalizing, setFinalizing] =
    useState(false);

  const [unfinalizing, setUnfinalizing] =
    useState(false);

  async function loadDraft() {
    try {
      const response =
        await fetch(
          "/api/admin/cwl/draft/current",
          {
            cache: "no-store",
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

  useEffect(() => {
    loadDraft();
  }, []);

  if (loading) {
    return (
      <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-white/40">
        🧠 CWL-concept laden...
      </section>
    );
  }

  if (error && !draft) {
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

  const isFinal =
    draft.status === "FINAL";

  async function movePlayer() {
    if (
      !movingPlayer ||
      !targetPlayer ||
      isFinal
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
              targetPlayerTag:
                targetPlayer,
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
      setTargetPlayer(null);

      await loadDraft();
    } catch {
      setError(
        "Speler kon niet worden verplaatst."
      );
    } finally {
      setMoving(false);
    }
  }

  async function finalizeDraft() {
    if (
      !draft ||
      isFinal ||
      finalizing
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Weet je zeker dat deze CWL-indeling definitief moet worden gemaakt? Daarna kunnen gewone admins geen wijzigingen meer uitvoeren."
      );

    if (!confirmed) {
      return;
    }

    setFinalizing(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/admin/cwl/finalize",
          {
            method: "POST",
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
            "CWL-indeling kon niet definitief worden gemaakt."
        );
        return;
      }

      setMovingPlayer(null);
      setTargetPlayer(null);

      await loadDraft();
    } catch {
      setError(
        "CWL-indeling kon niet definitief worden gemaakt."
      );
    } finally {
      setFinalizing(false);
    }
  }

  async function unfinalizeDraft() {
    if (
      !draft ||
      !isFinal ||
      !isSuperadmin ||
      unfinalizing
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Deze CWL-indeling is definitief. Wil je deze als SUPERADMIN terugzetten naar DRAFT zodat er opnieuw wijzigingen kunnen worden gemaakt?"
      );

    if (!confirmed) {
      return;
    }

    setUnfinalizing(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/admin/cwl/unfinalize",
          {
            method: "POST",
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
            "CWL-indeling kon niet worden ontgrendeld."
        );
        return;
      }

      await loadDraft();
    } catch {
      setError(
        "CWL-indeling kon niet worden ontgrendeld."
      );
    } finally {
      setUnfinalizing(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-cyan-400/15 bg-cyan-500/[0.03] p-4">

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-bold">
            ✏️ CWL-indeling bewerken
          </h2>

          <p className="mt-1 text-[10px] text-white/35">
            {isFinal
              ? "Definitieve indeling"
              : "Concept"}{" "}
            v{draft.version} •{" "}
            {draft.status}
          </p>
        </div>

        <span
          className={
            isFinal
              ? "w-fit rounded-md border border-green-400/20 bg-green-500/10 px-2 py-1 text-[9px] font-bold text-green-200"
              : "w-fit rounded-md border border-cyan-400/20 bg-cyan-500/10 px-2 py-1 text-[9px] font-bold text-cyan-200"
          }
        >
          {isFinal
            ? "🔒 FINAL"
            : "DRAFT"}
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-xs text-red-200">
          ❌ {error}
        </div>
      )}

      {isFinal && (
        <div className="mb-4 rounded-lg border border-green-400/20 bg-green-500/[0.06] p-3">
          <p className="text-xs font-semibold text-green-200">
            🔒 Deze CWL-indeling is definitief.
          </p>

          <p className="mt-1 text-[10px] leading-relaxed text-white/40">
            Gewone admins kunnen de indeling alleen bekijken.
            {isSuperadmin &&
              " Als SUPERADMIN kun je de indeling hieronder opnieuw ontgrendelen."}
          </p>

          {isSuperadmin && (
            <button
              type="button"
              onClick={unfinalizeDraft}
              disabled={unfinalizing}
              className="mt-3 w-full rounded-lg border border-orange-400/25 bg-orange-500/10 px-3 py-2.5 text-[10px] font-bold text-orange-200 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {unfinalizing
                ? "Ontgrendelen..."
                : "🔓 Terugzetten naar DRAFT"}
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {draft.clans.map((clan) => (
          <section
            key={clan.id}
            className="min-w-0 rounded-lg border border-white/10 bg-black/20 p-2.5"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-xs font-bold">
                  {clan.clanName}
                </h3>

                <p className="text-[8px] text-white/30">
                  {clan.format === "V30"
                    ? "30v30"
                    : "15v15"}{" "}
                  • {clan.players.length} spelers
                </p>
              </div>

              <span className="shrink-0 rounded-md border border-white/10 px-1.5 py-0.5 text-[8px] text-white/35">
                {clan.players.length}
              </span>
            </div>

            <div className="max-h-[360px] space-y-1 overflow-y-auto pr-1">
              {clan.players.map((player) => {
                const hasMissed =
                  (player.missedAttacks ?? 0) > 0;

                const regularAttacks =
                  player.regularWarAttacks ?? [];

                const oneStars =
                  regularAttacks.filter(
                    (attack) => attack.stars === 1
                  ).length;

                const twoStars =
                  regularAttacks.filter(
                    (attack) => attack.stars === 2
                  ).length;

                const needsReview =
                  hasMissed ||
                  oneStars > 0 ||
                  twoStars >= 6;

                const warningText =
                  hasMissed
                    ? `${player.missedAttacks}× CW gemist`
                    : oneStars > 0
                      ? `${oneStars}× 1⭐`
                      : twoStars >= 6
                        ? `${twoStars}× 2⭐`
                        : "";

                return (
                  <DraftPlayerRow
                    key={player.id}
                    player={player}
                    isFinal={isFinal}
                    needsReview={needsReview}
                    warningText={warningText}
                    movingPlayer={movingPlayer}
                    setMovingPlayer={setMovingPlayer}
                    targetPlayer={targetPlayer}
                    setTargetPlayer={setTargetPlayer}
                    draft={draft}
                    clan={clan}
                    movePlayer={movePlayer}
                    moving={moving}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {!isFinal && (
        <div className="mt-5 rounded-lg border border-orange-400/20 bg-orange-500/[0.05] p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold text-orange-200">
                🔒 Klaar met de CWL-indeling?
              </p>

              <p className="mt-1 text-[10px] leading-relaxed text-white/35">
                Maak de indeling definitief zodra alle spelers en posities gecontroleerd zijn.
              </p>
            </div>

            <button
              type="button"
              onClick={finalizeDraft}
              disabled={finalizing}
              className="w-full rounded-lg border border-orange-400/25 bg-orange-500/10 px-4 py-2.5 text-[10px] font-bold text-orange-200 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {finalizing
                ? "Definitief maken..."
                : "🔒 Definitieve CWL-indeling maken"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function DraftPlayerRow({
  player,
  isFinal,
  needsReview,
  warningText,
  movingPlayer,
  setMovingPlayer,
  targetPlayer,
  setTargetPlayer,
  draft,
  clan,
  movePlayer,
  moving,
}: any) {
  const [expanded, setExpanded] =
    useState(false);

  const isMoving =
    movingPlayer === player.playerTag;

  const otherClanPlayers =
    draft.clans
      .filter(
        (item: any) =>
          item.id !== clan.id
      )
      .flatMap(
        (item: any) =>
          item.players.map(
            (otherPlayer: any) => ({
              ...otherPlayer,
              clanName:
                item.clanName,
              clanId:
                item.id,
            })
          )
      );

  const regularAttacks =
    player.regularWarAttacks ?? [];

  const regularOneStar =
    regularAttacks.filter(
      (attack: any) =>
        attack.stars === 1
    ).length;

  const regularTwoStar =
    regularAttacks.filter(
      (attack: any) =>
        attack.stars === 2
    ).length;

  const regularThreeStar =
    regularAttacks.filter(
      (attack: any) =>
        attack.stars >= 3
    ).length;

  const regularWarsPlayed =
    new Set(
      regularAttacks.map(
        (attack: any) =>
          attack.warTag
      )
    ).size;

  const cwlStars =
    player.cwlStars ??
    player.stars ??
    0;

  const cwlAttacks =
    player.cwlAttacks ??
    player.attacks ??
    0;

  const cwlAverage =
    player.cwlStarsPerAttack ??
    (
      cwlAttacks > 0
        ? (cwlStars / cwlAttacks).toFixed(2)
        : "0.00"
    );

  return (
    <div
      className={`rounded-md border ${
        needsReview
          ? "border-orange-400/20 bg-orange-500/[0.03]"
          : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <button
        type="button"
        onClick={() =>
          setExpanded(!expanded)
        }
        className="w-full px-2 py-1.5 text-left"
      >
        <div className="flex items-center gap-1.5">
          <span className="w-4 shrink-0 text-[8px] text-white/25">
            {expanded ? "▼" : "▶"}
          </span>

          <span className="w-4 shrink-0 text-[8px] font-bold text-white/25">
            {player.position}
          </span>

          <span className="min-w-0 flex-1 truncate text-[10px] font-semibold">
            {player.name}
          </span>

          {player.townHall && (
            <span className="shrink-0 rounded bg-purple-500/10 px-1.5 py-0.5 text-[7px] font-bold text-purple-300">
              TH{player.townHall}
            </span>
          )}

          {needsReview && (
            <span className="shrink-0 text-[8px] font-bold text-orange-200">
              ⚠️
            </span>
          )}
        </div>

        {needsReview && warningText && (
          <p className="mt-0.5 ml-8 truncate text-[8px] font-semibold text-orange-200/75">
            {warningText}
          </p>
        )}
      </button>

      {expanded && (
        <div className="border-t border-white/10 px-2.5 py-2.5">
          {needsReview && (
            <div className="mb-2 rounded-md border border-orange-400/20 bg-orange-500/[0.05] px-2.5 py-2">
              <p className="text-[8px] font-bold uppercase tracking-wider text-orange-200">
                ⚠️ Controle nodig
              </p>

              <p className="mt-1 text-[9px] leading-relaxed text-orange-100/70">
                {warningText}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-1.5">
            <CompactDetail
              label="CWL sterren"
              value={`${cwlStars}/21 ⭐`}
            />

            <CompactDetail
              label="CWL aanvallen"
              value={`${cwlAttacks}/7`}
            />

            <CompactDetail
              label="CWL gem. ⭐"
              value={cwlAverage}
            />

            <CompactDetail
              label="CW gemist"
              value={player.missedAttacks ?? 0}
            />

            <CompactDetail
              label="CW 3⭐"
              value={regularThreeStar}
            />

            <CompactDetail
              label="CW 2⭐"
              value={regularTwoStar}
            />

            <CompactDetail
              label="CW 1⭐"
              value={regularOneStar}
            />

            <CompactDetail
              label="Meegespeelde CW's"
              value={regularWarsPlayed}
            />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {needsReview ? (
              <span className="rounded-md border border-orange-400/20 bg-orange-500/10 px-2 py-1 text-[8px] font-bold text-orange-200">
                ⚠️ CONTROLE NODIG
              </span>
            ) : (
              <span className="rounded-md border border-green-400/15 bg-green-500/10 px-2 py-1 text-[8px] font-bold text-green-200">
                🟢 GEEN CONTROLE
              </span>
            )}

            {!isFinal && (
              <button
                type="button"
                onClick={() => {
                  setMovingPlayer(
                    player.playerTag
                  );
                  setTargetPlayer(null);
                }}
                className="rounded-md border border-cyan-400/20 bg-cyan-500/10 px-2 py-1 text-[8px] font-bold text-cyan-200"
              >
                ↔ Wisselen
              </button>
            )}
          </div>

          {!isFinal &&
            isMoving && (
              <div className="mt-2 border-t border-white/10 pt-2">
                <p className="mb-1.5 text-[8px] font-bold uppercase tracking-wider text-cyan-200/70">
                  ↔ Wisselen met
                </p>

                <div className="max-h-36 space-y-1 overflow-y-auto pr-1">
                  {otherClanPlayers.map(
                    (otherPlayer: any) => {
                      const selected =
                        targetPlayer ===
                        otherPlayer.playerTag;

                      return (
                        <button
                          key={`${otherPlayer.clanId}-${otherPlayer.id}`}
                          type="button"
                          onClick={() =>
                            setTargetPlayer(
                              otherPlayer.playerTag
                            )
                          }
                          className={`flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left transition ${
                            selected
                              ? "border-cyan-400/30 bg-cyan-500/10"
                              : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                          }`}
                        >
                          <span className="w-5 shrink-0 text-[8px] font-bold text-white/25">
                            {otherPlayer.position}
                          </span>

                          <span className="min-w-0 flex-1 truncate text-[9px] font-semibold">
                            {otherPlayer.name}
                          </span>

                          <span className="shrink-0 text-[8px] text-white/35">
                            {otherPlayer.clanName}
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>

                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={movePlayer}
                    disabled={
                      moving ||
                      !targetPlayer
                    }
                    className="flex-1 rounded-md border border-green-400/20 bg-green-500/10 px-3 py-1.5 text-[9px] font-bold text-green-200 hover:bg-green-500/20 disabled:opacity-40"
                  >
                    {moving
                      ? "Wisselen..."
                      : "↔ Wisselen"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMovingPlayer(null);
                      setTargetPlayer(null);
                    }}
                    className="rounded-md border border-white/10 px-3 py-1.5 text-[9px] text-white/50 hover:bg-white/5"
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
}

function CompactDetail({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
      <p className="text-[7px] text-white/30">
        {label}
      </p>

      <p className="mt-0.5 truncate text-[9px] font-semibold text-white/75">
        {value}
      </p>
    </div>
  );
}
