"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminAccountPage() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (newPassword !== confirmPassword) {
      setError(
        "De nieuwe wachtwoorden komen niet overeen."
      );
      return;
    }

    if (newPassword.length < 8) {
      setError(
        "Het nieuwe wachtwoord moet minimaal 8 tekens bevatten."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/admin/change-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(
          data.error ||
            "Wachtwoord wijzigen is mislukt."
        );
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setMessage(
        "Je wachtwoord is succesvol gewijzigd."
      );
    } catch {
      setError(
        "Er kon geen verbinding met Phoenix worden gemaakt."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-3xl">

        {/* Header */}
        <header className="mb-6">
          <button
            type="button"
            onClick={() =>
              router.push("/admin")
            }
            className="mb-4 text-sm text-white/50 transition hover:text-orange-300"
          >
            ← Terug naar Admin Dashboard
          </button>

          <p className="text-xs font-medium uppercase tracking-[0.2em] text-orange-300">
            🛡️ TDG Phoenix
          </p>

          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
            Mijn account
          </h1>

          <p className="mt-2 text-sm text-white/50">
            Beheer je eigen wachtwoord.
          </p>
        </header>

        {/* Password card */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">
              🔑 Wachtwoord wijzigen
            </h2>

            <p className="mt-1 text-sm text-white/45">
              Gebruik een uniek wachtwoord dat
              alleen jij kent.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* Current password */}
            <div>
              <label
                htmlFor="currentPassword"
                className="mb-1.5 block text-sm font-medium text-white"
              >
                Huidig wachtwoord
              </label>

              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(event) =>
                  setCurrentPassword(
                    event.target.value
                  )
                }
                autoComplete="current-password"
                required
                disabled={loading}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-orange-400/60 disabled:opacity-50"
                placeholder="Huidig wachtwoord"
              />
            </div>

            {/* New password */}
            <div>
              <label
                htmlFor="newPassword"
                className="mb-1.5 block text-sm font-medium text-white"
              >
                Nieuw wachtwoord
              </label>

              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(event) =>
                  setNewPassword(
                    event.target.value
                  )
                }
                autoComplete="new-password"
                required
                disabled={loading}
                minLength={8}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-orange-400/60 disabled:opacity-50"
                placeholder="Minimaal 8 tekens"
              />
            </div>

            {/* Confirm password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-medium text-white"
              >
                Nieuw wachtwoord opnieuw
              </label>

              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                autoComplete="new-password"
                required
                minLength={8}
                disabled={loading}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-orange-400/60 disabled:opacity-50"
                placeholder="Herhaal je nieuwe wachtwoord"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {/* Success */}
            {message && (
              <div className="rounded-xl border border-green-400/25 bg-green-500/10 px-4 py-3 text-sm text-green-200">
                {message}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {loading
                ? "Wachtwoord wijzigen..."
                : "🔐 Wachtwoord wijzigen"}
            </button>
          </form>
        </section>

        {/* Security information */}
        <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="text-sm font-semibold">
            🛡️ Beveiliging
          </h2>

          <ul className="mt-3 space-y-2 text-xs text-white/45">
            <li>
              • Je wachtwoord wordt veilig gehasht
              opgeslagen.
            </li>

            <li>
              • Wachtwoorden worden nooit in de
              auditlog opgeslagen.
            </li>

            <li>
              • Adminsessies verlopen na 1 uur
              inactiviteit.
            </li>
          </ul>
        </section>

      </div>
    </main>
  );
}