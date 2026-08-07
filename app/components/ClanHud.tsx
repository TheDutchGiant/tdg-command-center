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
};

export default function ClanHud({ clan }: ClanHudProps) {
  const isMainClan = clan.tag === "#2JLLPVGUU";

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

      {isMainClan && (
        <div className="flex items-center gap-2 text-lg font-semibold">
          🇳🇱 <span>Top 200</span>
        </div>
      )}
    </>
  );
}