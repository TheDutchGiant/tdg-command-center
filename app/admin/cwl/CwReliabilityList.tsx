"use client";

import { useState } from "react";

type ReliabilityPlayer = {
  playerTag: string;
  name: string;
  townHall: number | null;
  stars: number;
  attacks: number;
  missedAttacks: number;
  defenceStars: number;
  starsPerAttack: number;
  lastCwlClan: string | null;
};

export default function CwReliabilityList({
  players,
}: {
  players: ReliabilityPlayer[];
}) {
  if (players.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-orange-400/15 bg-orange-500/[0.03] p-3">
      <p className="text-[10px] font-bold text-orange-200">
        ⚠️ Controle nodig
      </p>

      <div className="mt-2 space-y-1">
        {players.map((player) => (
          <div
            key={player.playerTag}
            className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-black/20 px-2.5 py-1.5"
          >
            <div className="min-w-0">
              <span className="text-[10px] font-semibold">
                {player.name}
              </span>

              {player.townHall && (
                <span className="ml-2 rounded bg-purple-500/10 px-1.5 py-0.5 text-[8px] font-bold text-purple-300">
                  TH{player.townHall}
                </span>
              )}
            </div>

            <span className="shrink-0 text-[9px] font-bold text-orange-200">
              {player.missedAttacks > 0
                ? `${player.missedAttacks}× gemist`
                : player.starsPerAttack < 1
                  ? "0⭐"
                  : "Controle"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
