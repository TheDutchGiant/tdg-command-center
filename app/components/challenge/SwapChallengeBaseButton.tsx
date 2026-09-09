"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SwapChallengeBaseButtonProps = {
  challengeId: number;
};

export default function SwapChallengeBaseButton({
  challengeId,
}: SwapChallengeBaseButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function swapBase() {
    if (busy) return;

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/challenge/swap-base",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            challengeId,
          }),
        },
      );

      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
        error?: string;
        base?: {
          name?: string;
        };
      };

      if (!response.ok || !data.success) {
        setMessage(
          data.message ??
            data.error ??
            "Base wisselen is mislukt.",
        );
        return;
      }

      setMessage(
        `Nieuwe base: ${data.base?.name ?? "geladen"}`,
      );

      router.refresh();
    } catch {
      setMessage("Er ging iets mis bij het wisselen van de base.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={swapBase}
        disabled={busy}
        className="block w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-xs font-black text-white transition hover:border-orange-400/30 hover:bg-orange-500/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "⏳ Andere base laden..." : "🔄 Andere Challenge Base"}
      </button>

      {message && (
        <p className="mt-2 text-center text-[10px] leading-4 text-white/45">
          {message}
        </p>
      )}
    </div>
  );
}
