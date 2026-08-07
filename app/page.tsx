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

        {/* Hero */}
        <div className="relative mb-16 overflow-hidden rounded-3xl border border-neutral-800 shadow-2xl">
          <img
            src="/images/hero/tdg-archives-hero.png"
            alt="The Dutch Giant Family Archives"
            className="w-full h-auto"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        </div>

        {/* Clan Cards */}
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