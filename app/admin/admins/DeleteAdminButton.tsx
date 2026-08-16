"use client";

import { useState } from "react";

export default function DeleteAdminButton({
  adminId,
  username,
}: {
  adminId: number;
  username: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Weet je zeker dat je admin "${username}" wilt verwijderen?`
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/admin/admins/delete",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            adminId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Verwijderen is mislukt."
        );
      }

      window.location.reload();
    } catch (error) {
      console.error(error);

      window.alert(
        error instanceof Error
          ? error.message
          : "Verwijderen is mislukt."
      );

      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:border-red-400/40 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {loading
        ? "Verwijderen..."
        : "🗑️ Verwijderen"}
    </button>
  );
}