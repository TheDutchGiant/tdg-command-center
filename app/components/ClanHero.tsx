import ClanHud from "./ClanHud";
import type { CwlSimulationResult } from "@/app/lib/cwl/types";
import { fetchNetherlandsClanRanking } from "@/app/lib/clash";

type ClanHeroProps = {
  clan: {
    tag: string;
    name: string;
    members: number;
    warWinStreak: number;
    warLeague: {
      name: string;
    };
    badgeUrls: {
      large: string;
    };
  };

  promotion?: {
    position: number;
    promotionPosition: number;
    maximumPromotionPosition: number;
    currentStars: number;
    bonusStars: number;
    totalStars: number;
    destruction: number;
    currentWars: number;
    remainingWars: number;
  } | null;

  prediction?: CwlSimulationResult | null;

  netherlandsRank?: number | null;
};

export default async function ClanHero({
  clan,
  promotion,
  prediction,
  netherlandsRank: providedNetherlandsRank,
}: ClanHeroProps) {
  const normalizedTag = clan.tag.replace(/^#/, "");

  const isMainClan = normalizedTag === "2JLLPVGUU";

  const netherlandsRank =
    providedNetherlandsRank !== undefined
      ? providedNetherlandsRank
      : isMainClan
      ? await fetchNetherlandsClanRanking(clan.tag)
      : null;

  const heroImage =
    normalizedTag === "2JLLPVGUU"
      ? "/images/archives/tdg-main-archive.png"
      : normalizedTag === "2CVVG00QQ"
      ? "/images/archives/tdg-ii-archive.png"
      : normalizedTag === "2CQ2LGQJ2"
      ? "/images/archives/tdg-mini-archive.png"
      : "/images/archives/tdg-micro-archive.png";

  return (
    <section className="mb-8 overflow-hidden rounded-3xl border border-neutral-800 shadow-2xl">
      <img
        src={heroImage}
        alt={`${clan.name} Archives`}
        className="block w-full"
      />

      <div className="tdg-clan-hud">
        <ClanHud
          clan={clan}
          promotion={promotion}
          prediction={prediction}
          netherlandsRank={netherlandsRank}
        />
      </div>
    </section>
  );
}