type ClanHeaderProps = {
  clan: {
    name: string;
    members: number;
    clanLevel: number;
    warWinStreak: number;
    warLeague: {
      name: string;
    };
    badgeUrls: {
      large: string;
    };
  };
};

export default function ClanHeader({ clan }: ClanHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-neutral-900 py-10 px-8 shadow-xl">

      {/* Gouden gloed */}
      <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-500/20 blur-3xl" />

      {/* Clannaam */}
      <h1 className="relative mb-8 text-center text-4xl font-bold text-white">
        {clan.name}
      </h1>

      {/* Links - Badge - Rechts */}
      <div className="relative grid grid-cols-3 items-center">

        {/* Links */}
        <div className="flex flex-col items-end gap-6 pr-8">

          <div className="text-right">
            <div className="text-sm text-neutral-400">
              Leden
            </div>

            <div className="text-3xl font-bold">
              👥 {clan.members}/50
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-neutral-400">
              Clan Level
            </div>

            <div className="text-3xl font-bold">
              ⭐ {clan.clanLevel}
            </div>
          </div>

        </div>

        {/* Badge */}
        <div className="flex justify-center">
          <img
            src={clan.badgeUrls.large}
            alt={clan.name}
            className="h-40 w-40 drop-shadow-[0_0_40px_rgba(255,215,0,0.45)]"
          />
        </div>

        {/* Rechts */}
        <div className="flex flex-col gap-6 pl-8">

          <div>
            <div className="text-sm text-neutral-400">
              War League
            </div>

            <div className="text-2xl font-bold">
              ⚔️ {clan.warLeague.name}
            </div>
          </div>

          <div>
            <div className="text-sm text-neutral-400">
              Win Streak
            </div>

            <div className="text-3xl font-bold">
              🔥 {clan.warWinStreak}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}