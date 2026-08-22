"use client";

import { useState } from "react";

export default function CwMissedAttackDeleteButton({
  playerTag,
  clanTag,
  playerName,
}: {
  playerTag: string;
  clanTag: string;
  playerName: string;
}) {
  const [loading, setLoading] =
    useState(false);

  async function removeLog() {
    const confirmed =
      window.confirm(
        `Gemiste-aanvallenlog van ${playerName} voor deze clan verwijderen?`
      );

    if (!confirmed) {
      return;
    }

    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/admin/cw/missed-attacks/delete",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              playerTag,
              clanTag,
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        window.alert(
          data.error ||
            "Verwijderen is mislukt."
        );
        return;
      }

      window.location.reload();
    } catch {
      window.alert(
        "Verwijderen is mislukt."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={removeLog}
      disabled={loading}
      className="rounded-md border border-white/10 px-2 py-1 text-[9px] text-white/30 transition hover:border-red-400/30 hover:text-red-300 disabled:opacity-40"
    >
      {loading
        ? "..."
        : "Verwijder"}
    </button>
  );
}
