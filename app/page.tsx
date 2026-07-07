"use client";

import { useEffect, useState } from "react";

type Clan = {
  name: string;
  members: number;
};

export default function Home() {
  const [clans, setClans] = useState<Clan[]>([]);

  useEffect(() => {
    async function loadClans() {
      try {
        const response = await fetch("/api/clan");

        if (!response.ok) {
          throw new Error(`API fout: ${response.status}`);
        }

        const data = await response.json();
        setClans(data);
      } catch (error) {
        console.error(error);
      }
    }

    loadClans();
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
          {clans.map((clan, index) => (
            <div
              key={index}
              className="rounded-xl bg-neutral-900 p-6 shadow-lg"
            >
              <h2 className="text-xl font-bold">{clan.name}</h2>

              <p className="mt-2 text-3xl font-bold">
                {clan.members} / 50
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}