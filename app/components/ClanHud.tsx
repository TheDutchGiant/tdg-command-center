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

function getLeagueName(name: string) {
  const normalized = name.trim();

  const championMatch = normalized.match(
    /^Champion League\s+(I|II|III)$/i
  );

  if (championMatch) {
    const roman = championMatch[1].toUpperCase();

    const level =
      roman === "I"
        ? "1"
        : roman === "II"
        ? "2"
        : "3";

    return {
      desktop: normalized,
      mobile: `Champ ${level}`,
    };
  }

  const titanMatch = normalized.match(
    /^Titan League\s+(I|II|III)$/i
  );

  if (titanMatch) {
    const roman = titanMatch[1].toUpperCase();

    const level =
      roman === "I"
        ? "1"
        : roman === "II"
        ? "2"
        : "3";

    return {
      desktop: normalized,
      mobile: `Titan ${level}`,
    };
  }

  return {
    desktop: normalized,
    mobile: normalized,
  };
}

function getPromotionLight(
  prediction?: CwlSimulationResult | null
) {
  if (!prediction) {
    return null;
  }

  if (prediction.promotionStatus === "GUARANTEED") {
    return "green";
  }

  if (prediction.promotionStatus === "POSSIBLE") {
    return "orange";
  }

  if (prediction.promotionStatus === "IMPOSSIBLE") {
    return "red";
  }

  return null;
}

export default function ClanHud({
  clan,
  promotion,
  prediction,
  netherlandsRank,
}: ClanHudProps) {
  const isMainClan =
    clan.tag === "#2JLLPVGUU" ||
    clan.tag === "2JLLPVGUU";

  /*
   * CWL HUD is visible during the CWL cycle:
   * days 1 through 10.
   *
   * From the 11th onward the complete CWL HUD item
   * disappears from the clan header.
   */
  const currentDay = new Date().getDate();
  const showCwlHud =
    currentDay >= 1 &&
    currentDay <= 10 &&
    promotion !== null &&
    promotion !== undefined;

  const league = getLeagueName(clan.warLeague.name);
  const promotionLight = getPromotionLight(prediction);

  return (
    <>
      {/* 1. MEMBERS */}
      <div className="tdg-hud-item">
        <span>👥</span>
        <span>{clan.members}/50</span>
      </div>

      {/* 2. CLAN BADGE */}
      <div className="tdg-hud-badge">
        <img
          src={clan.badgeUrls.large}
          alt="Clan Badge"
        />
      </div>

      {/* 3. WAR LEAGUE */}
      <div className="tdg-hud-item tdg-hud-league">
        <span>⚔️</span>

        <span className="tdg-league-desktop">
          {league.desktop}
        </span>

        <span className="tdg-league-mobile">
          {league.mobile}
        </span>
      </div>

      {/* 4. WIN STREAK */}
      <div className="tdg-hud-item">
        <span>🔥</span>
        <span>{clan.warWinStreak}</span>
      </div>

      {/* 5. NETHERLANDS RANK */}
      {isMainClan &&
        netherlandsRank !== null &&
        netherlandsRank !== undefined && (
          <div className="tdg-hud-item">
            <span>🇳🇱</span>
            <span>#{netherlandsRank} NL</span>
          </div>
        )}

      {/* 6. CWL SUMMARY */}
      {showCwlHud && (
        <div className="tdg-cwl-summary">
          <span>🏆 #{promotion.position}</span>

          <span>⭐ {promotion.totalStars}</span>

          {promotionLight && (
            <span className={`tdg-promotion ${promotionLight}`}>
              <span className="tdg-promotion-dot" />
              <span>PROMOTIE</span>
            </span>
          )}
        </div>
      )}
    </>
  );
}