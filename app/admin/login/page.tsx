"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        "/api/admin/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(
          data.error ||
            "Inloggen is mislukt."
        );
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError(
        "Er kon geen verbinding met Phoenix worden gemaakt."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black">

      {/* Desktop background */}
      <div
        className="absolute inset-0 hidden bg-cover bg-center bg-no-repeat sm:block"
        style={{
          backgroundImage:
            "url('/images/admin-login.png')",
        }}
      />

      {/* Mobile background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat sm:hidden"
        style={{
          backgroundImage:
            "url('/images/admin-login.png')",
        }}
      />

      {/* Desktop overlay */}
      <div className="absolute inset-0 hidden bg-black/25 sm:block" />

      {/* Mobile overlay */}
      <div className="absolute inset-0 bg-black/25 sm:hidden" />

      {/* Login panel */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-3 py-4 sm:items-start sm:pt-[58vh]">

        <div className="w-full max-w-[155px] sm:max-w-[260px]">

          <div className="rounded-xl border border-orange-400/30 bg-black/65 px-2.5 py-2.5 shadow-xl backdrop-blur-sm sm:px-4 sm:py-4">

            <form
              onSubmit={handleSubmit}
              className="space-y-2.5"
            >
              {/* Username */}
              <div>
                <label
                  htmlFor="username"
                  className="mb-1 block text-[10px] font-medium text-white"
                >
                  Gebruikersnaam
                </label>

                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(event) =>
                    setUsername(
                      event.target.value
                    )
                  }
                  autoComplete="username"
                  required
                  disabled={loading}
                  placeholder="Gebruikersnaam"
                  className="w-full rounded-lg border border-white/15 bg-black/55 px-2.5 py-2 text-[11px] text-white outline-none placeholder:text-white/35 focus:border-orange-400/70 disabled:opacity-50"
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-1 block text-[10px] font-medium text-white"
                >
                  Wachtwoord
                </label>

                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  placeholder="Wachtwoord"
                  className="w-full rounded-lg border border-white/15 bg-black/55 px-2.5 py-2 text-[11px] text-white outline-none placeholder:text-white/35 focus:border-orange-400/70 disabled:opacity-50"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-2 py-1.5 text-[9px] text-red-200">
                  {error}
                </div>
              )}

              {/* Login */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-orange-500 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-orange-400 disabled:opacity-50"
              >
                {loading
                  ? "Inloggen..."
                  : "🔐 Inloggen"}
              </button>
            </form>

            {/* Back */}
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() =>
                  router.push("/")
                }
                className="text-[9px] text-white/55 transition hover:text-orange-300"
              >
                ← Terug naar Phoenix
              </button>
            </div>

          </div>

          {/* Authorization notice */}
          <p className="mt-2 text-center text-[8px] text-white/60">
            🛡️ Alleen voor geautoriseerde
            beheerders
          </p>

        </div>
      </div>
    </main>
  );
}