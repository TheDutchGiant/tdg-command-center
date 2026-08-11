"use client";

import { useEffect, useState } from "react";
import ClanCard from "@/app/components/ClanCard";
import TdgMusicPlayer from "@/app/components/TdgMusicPlayer";

type Clan = {
  name: string;
  members: number;
  tag: string;
};

const DISCORD_INVITE = "https://discord.gg/AWxMw96aTW";

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

        <TdgMusicPlayer />

        {/* Clan Cards */}
        <div
          className="mt-10"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "16px",
          }}
        >
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

        {/* Discord Community */}
        <section className="mt-16 overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950 shadow-2xl">
          <div className="px-6 pb-8 pt-2 text-center">
            <h2 className="text-2xl font-black tracking-tight text-white">
              💬 Join the TDG Community
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-sm text-neutral-400">
              Onze gezamenlijke Discord-community voor The Dutch Giant,
              TDG II, TDG Mini en TDG Micro.
            </p>
          </div>

          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Join The Dutch Giant Discord"
            className="group block"
          >
            <img
              src="/images/discord/discord-banner.png"
              alt="Join The Dutch Giant Discord"
              className="block w-full transition duration-300 group-hover:brightness-110"
            />
          </a>

          <p className="px-6 py-4 text-center text-xs text-neutral-600">
            Klik op de afbeelding om onze Discord te openen.
          </p>
        </section>

      </div>
    </main>
  );
}