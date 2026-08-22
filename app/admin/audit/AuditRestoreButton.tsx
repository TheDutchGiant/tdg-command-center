"use client";

import { useState } from "react";

export default function AuditRestoreButton({
  auditId,
}: {
  auditId: number;
}) {
  const [loading, setLoading] =
    useState(false);

  async function restore() {
    const confirmed =
      window.confirm(
        "Deze gemiste-aanvallenlog terugzetten?"
      );

    if (!confirmed) {
      return;
    }

    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/admin/cw/missed-attacks/restore",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              auditId,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        window.alert(
          data.error ||
            "Herstellen is mislukt."
        );
        return;
      }

      window.location.reload();
    } catch {
      window.alert(
        "Herstellen is mislukt."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={restore}
      disabled={loading}
      className="mt-3 rounded-md border border-green-400/20 bg-green-500/[0.05] px-3 py-1.5 text-[9px] font-semibold text-green-300 transition hover:border-green-400/40 hover:bg-green-500/10 disabled:cursor-wait disabled:opacity-40"
    >
      {loading
        ? "Herstellen..."
        : "↩️ Herstellen"}
    </button>
  );
}
