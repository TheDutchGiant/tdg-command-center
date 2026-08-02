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
    <div className="relative -mx-8 mb-10 overflow-hidden bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-950 py-12">

      <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-400/20 blur-[110px]" />

      <PhoenixTitle text={clan.name} />

      <div className="relative z-10 mt-8 grid grid-cols-3 items-center">

        <div className="flex flex-col items-end gap-8 pr-6">

          <div className="text-right">
            <div className="text-sm uppercase tracking-widest text-neutral-500">
              Leden
            </div>

            <div className="mt-1 text-3xl font-bold">
              👥 {clan.members}/50
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm uppercase tracking-widest text-neutral-500">
              Clan Level
            </div>

            <div className="mt-1 text-3xl font-bold">
              ⭐ {clan.clanLevel}
            </div>
          </div>

        </div>
        <div className="flex justify-center">

          <img
            src={clan.badgeUrls.large}
            alt={clan.name}
            className="h-44 w-44 drop-shadow-2xl"
          />

        </div>

        <div className="flex flex-col gap-8 pl-6">

          <div>
            <div className="text-sm uppercase tracking-widest text-neutral-500">
              War League
            </div>

            <div className="mt-1 text-2xl font-bold">
              ⚔️ {clan.warLeague.name}
            </div>
          </div>

          <div>
            <div className="text-sm uppercase tracking-widest text-neutral-500">
              Win Streak
            </div>

            <div className="mt-1 text-3xl font-bold">
              🔥 {clan.warWinStreak}
            </div>
          </div>

        </div>

      </div>

      <div className="absolute bottom-0 left-0 h-20 w-full bg-gradient-to-b from-transparent to-neutral-950" />

    </div>
  );
}