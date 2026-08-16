"use client";

import { useState } from "react";

export default function ResetAdminPasswordButton({
  adminId,
  username,
}: {
  adminId: number;
  username: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    const newPassword = window.prompt(
      `Nieuw wachtwoord voor ${username}:`
    );

    if (newPassword === null) {
      return;
    }

    if (newPassword.length < 8) {
      window.alert(
        "Het wachtwoord moet minimaal 8 tekens bevatten."
      );
      return;
    }

    const confirmed = window.confirm(
      `Wachtwoord van ${username} resetten?`
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/admin/admins/reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            adminId,
            newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Wachtwoord resetten is mislukt."
        );
      }

      window.alert(
        "✅ Wachtwoord succesvol gereset."
      );
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Wachtwoord resetten is mislukt."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleReset}
      disabled={loading}
      className="rounded-lg border border-blue-400/20 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-300 transition hover:border-blue-400/40 hover:bg-blue-500/20 disabled:opacity-40"
    >
      {loading
        ? "Resetten..."
        : "🔑 Reset wachtwoord"}
    </button>
  );
}