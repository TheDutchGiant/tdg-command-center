"use client";

import { useEffect, useState } from "react";
import ClanCard from "@/app/components/ClanCard";

type Clan = {
  name: string;
  members: number;
  tag: string;
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
        <div className="mb-16 text-center">
          <div className="mb-4 text-7xl">
            🔥
          </div>

          <h1 className="text-6xl font-extrabold tracking-wide text-yellow-400">
            TDG Family
          </h1>

          <p className="mt-4 text-2xl font-semibold text-yellow-300">
            The Digital Memory of The Dutch Giant
          </p>

          <p className="mt-3 text-lg italic text-red-500">
            Live today. Remember forever.
          </p>

          <p className="mt-6 text-sm text-neutral-500">
            Brought to you live by{" "}
            <span className="font-semibold text-orange-400">
              TDG Phoenix
            </span>{" "}
            · Our Technical AI
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-4">
          {clans.map((clan) => (
            <ClanCard
              key={clan.tag}
              name={clan.name}
              tag={clan.tag.replace("#", "")}
              members={clan.members}
              image={
                clan.tag === "#2JLLPVGUU"
                  ? "/images/tdg-main.png"
                  : clan.tag === "#2CVVG00QQ"
                  ? "/images/tdg-2.png"
                  : clan.tag === "#2CQ2LGQJ2"
                  ? "/images/tdg-mini.png"
                  : "/images/tdg-micro.png"
             }
             glow={
               clan.tag === "#2JLLPVGUU"
                 ? "shadow-orange-500/50 hover:shadow-orange-500/80"
                 : clan.tag === "#2CVVG00QQ"
                 ? "shadow-cyan-500/50 hover:shadow-cyan-500/80"
                 : clan.tag === "#2CQ2LGQJ2"
                 ? "shadow-green-500/50 hover:shadow-green-500/80"
                 : "shadow-purple-500/50 hover:shadow-purple-500/80"
             }
           />
          ))}
        </div>
      </div>
    </main>
  );
}