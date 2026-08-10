import type { CwlSimulationResult } from "@/app/lib/cwl/types";

type ClanHudProps = {
  clan: {
    tag: string;
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

export default function ClanHud({
  clan,
  promotion,
  prediction,
  netherlandsRank,
}: ClanHudProps) {
  const isMainClan =
    clan.tag === "#2JLLPVGUU" ||
    clan.tag === "2JLLPVGUU";

  return (
    <>
      <div className="flex items-center gap-2 text-lg font-semibold">
        👥 <span>{clan.members}/50</span>
      </div>

      <img
        src={clan.badgeUrls.large}
        alt="Clan Badge"
        className="h-12 w-12"
      />

      <div className="flex items-center gap-2 text-lg font-semibold">
        ⚔️ <span>{clan.warLeague.name}</span>
      </div>

      <div className="flex items-center gap-2 text-lg font-semibold">
        🔥 <span>{clan.warWinStreak}</span>
      </div>

      {isMainClan && netherlandsRank !== null && netherlandsRank !== undefined && (
        <div className="flex items-center gap-2 text-lg font-semibold">
          🇳🇱 <span>#{netherlandsRank} NL</span>
        </div>
      )}

      {promotion && (
        <div className="flex items-center gap-3 text-lg font-semibold">
          <span>
            🏆 #{promotion.position}
          </span>

          <span>
            ⭐ {promotion.totalStars}
          </span>

          {prediction?.promotionStatus === "GUARANTEED" && (
            <span className="text-sm text-neutral-300">
              🟢 PROMOTIE GEGARANDEERD
            </span>
          )}

          {prediction?.promotionStatus === "POSSIBLE" && (
            <span className="text-sm text-neutral-300">
              🟡 PROMOTIE NOG MOGELIJK
            </span>
          )}

          {prediction?.promotionStatus === "IMPOSSIBLE" && (
            <span className="text-sm text-neutral-300">
              🔴 PROMOTIE ONMOGELIJK
            </span>
          )}

          {prediction && (
            <span className="text-sm text-neutral-400">
              max #{prediction.bestPossiblePosition}
            </span>
          )}
        </div>
      )}
    </>
  );
}