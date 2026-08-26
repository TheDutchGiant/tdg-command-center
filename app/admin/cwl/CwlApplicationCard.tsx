"use client";

import { useState } from "react";

type Availability =
  | "FULL"
  | "LIMITED";

type ApplicationStatus =
  | "AUTO_APPROVED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

type Props = {
  application: {
    id: number;
    playerTag: string;
    clashName: string;
    availability: Availability;
    status: ApplicationStatus;
  };
};

export default function CwlApplicationCard({
  application,
}: Props) {
  const [status, setStatus] =
    useState<ApplicationStatus>(
      application.status
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function changeStatus(
    nextStatus:
      | "APPROVED"
      | "REJECTED"
  ) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/admin/cwl/application/status",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            playerTag:
              application.playerTag,
            status: nextStatus,
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
            "Wijzigen is mislukt."
        );
        return;
      }

      setStatus(nextStatus);
    } catch {
      setError(
        "Er kon geen verbinding met Phoenix worden gemaakt."
      );
    } finally {
      setLoading(false);
    }
  }

  const statusLabel =
    status === "AUTO_APPROVED"
      ? "🟢 AUTOMATISCH GOEDGEKEURD"
      : status === "APPROVED"
        ? "🔵 GOEDGEKEURD"
        : status === "REJECTED"
          ? "🔴 AFGEWEZEN"
          : "🟡 WACHT OP GOEDKEURING";

  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
      <div className="flex flex-col gap-1.5 lg:flex-row lg:items-center lg:justify-between">

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">

            <h3 className="text-[11px] font-semibold">
              {application.clashName}
            </h3>

            <span className="shrink-0 whitespace-nowrap rounded bg-white/5 px-1.5 py-0.5 text-[6px] font-bold text-white/60">
              {statusLabel}
            </span>

            {application.availability ===
              "FULL" && (
              <span className="shrink-0 whitespace-nowrap rounded bg-green-500/10 px-1.5 py-0.5 text-[6px] font-bold text-green-300">
                🟢 VOLLEDIG
              </span>
            )}

            {application.availability ===
              "LIMITED" && (
              <span className="shrink-0 whitespace-nowrap rounded bg-yellow-500/10 px-1.5 py-0.5 text-[6px] font-bold text-yellow-300">
                🟡 BEPERKT
              </span>
            )}

          </div>

          <p className="mt-0.5 font-mono text-[8px] text-white/30">
            {application.playerTag}
          </p>

          {error && (
            <p className="mt-2 text-[10px] text-red-300">
              ❌ {error}
            </p>
          )}
        </div>

        {status === "PENDING" && (
          <div className="flex shrink-0 items-center gap-1">

            <button
              type="button"
              disabled={loading}
              onClick={() =>
                changeStatus("APPROVED")
              }
              className="rounded-md border border-green-400/25 bg-green-500/10 px-1.5 py-1 text-[7px] font-bold text-green-300 transition hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Bezig..."
                : "✅ Goedkeuren"}
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() =>
                changeStatus("REJECTED")
              }
              className="rounded-md border border-red-400/25 bg-red-500/10 px-1.5 py-1 text-[7px] font-bold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Bezig..."
                : "❌ Afwijzen"}
            </button>

          </div>
        )}

      </div>
    </article>
  );
}
