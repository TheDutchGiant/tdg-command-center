"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [members, setMembers] = useState<number | null>(null);

  useEffect(() => {
    async function loadClan() {
      try {
        const response = await fetch("/api/clan");
        const data = await response.json();
        setMembers(data.members);
      } catch (error) {
        console.error(error);
      }
    }

    loadClan();
  }, []);

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-7xl p-8">

        <h1 className="text-5xl font-bold text-yellow-400">
          🏰 TDG Command Center
        </h1>

        <p className="mt-2 text-neutral-400">
          Management Portal voor The Dutch Giant Family
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-4">

          <div className="rounded-xl bg-neutral-900 p-6">
            <h2 className="text-xl font-bold">🏆 Main</h2>
            <p className="mt-2 text-3xl">
              {members === null ? "Laden..." : `${members} / 50`}
            </p>
          </div>

          <div className="rounded-xl bg-neutral-900 p-6">
            <h2 className="text-xl font-bold">⚔️ TDG II</h2>
            <p className="mt-2 text-3xl">Binnenkort...</p>
          </div>

          <div className="rounded-xl bg-neutral-900 p-6">
            <h2 className="text-xl font-bold">🛡️ TDG Mini</h2>
            <p className="mt-2 text-3xl">Binnenkort...</p>
          </div>

          <div className="rounded-xl bg-neutral-900 p-6">
            <h2 className="text-xl font-bold">⭐ TDG Micro</h2>
            <p className="mt-2 text-3xl">Binnenkort...</p>
          </div>

        </div>

      </div>
    </main>
  );
}