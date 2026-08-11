import PhoenixTitle from "./PhoenixTitle";

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
    <div className="relative -mx-8 mb-10 overflow-hidden bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-950 py-8 sm:py-12">

      <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-400/20 blur-[110px]" />

      <PhoenixTitle text={clan.name} />

      <div className="relative z-10 mt-8 grid grid-cols-2 items-center gap-y-8 px-4 sm:mt-8 sm:grid-cols-3 sm:gap-0 sm:px-0">

        {/* Links / mobiel linksboven */}
        <div className="flex flex-col items-center gap-6 sm:items-end sm:gap-8 sm:pr-6">

          <div className="text-center sm:text-right">
            <div className="text-xs uppercase tracking-widest text-neutral-500 sm:text-sm">
              Leden
            </div>

            <div className="mt-1 text-2xl font-bold sm:text-3xl">
              👥 {clan.members}/50
            </div>
          </div>

          <div className="text-center sm:text-right">
            <div className="text-xs uppercase tracking-widest text-neutral-500 sm:text-sm">
              Clan Level
            </div>

            <div className="mt-1 text-2xl font-bold sm:text-3xl">
              ⭐ {clan.clanLevel}
            </div>
          </div>

        </div>

        {/* Badge */}
        <div className="col-span-2 flex justify-center sm:col-span-1 sm:row-span-2 sm:row-start-1">
          <img
            src={clan.badgeUrls.large}
            alt={clan.name}
            className="h-32 w-32 drop-shadow-2xl sm:h-44 sm:w-44"
          />
        </div>

        {/* Rechts / mobiel rechts */}
        <div className="flex flex-col items-center gap-6 sm:items-start sm:gap-8 sm:pl-6">

          <div className="text-center sm:text-left">
            <div className="text-xs uppercase tracking-widest text-neutral-500 sm:text-sm">
              War League
            </div>

            <div className="mt-1 text-xl font-bold sm:text-2xl">
              ⚔️ {clan.warLeague.name}
            </div>
          </div>

          <div className="text-center sm:text-left">
            <div className="text-xs uppercase tracking-widest text-neutral-500 sm:text-sm">
              Win Streak
            </div>

            <div className="mt-1 text-2xl font-bold sm:text-3xl">
              🔥 {clan.warWinStreak}
            </div>
          </div>

        </div>

      </div>

      <div className="absolute bottom-0 left-0 h-20 w-full bg-gradient-to-b from-transparent to-neutral-950" />

    </div>
  );
}