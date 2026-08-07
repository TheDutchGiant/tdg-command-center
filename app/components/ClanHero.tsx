import ClanHud from "./ClanHud";

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
};

export default function ClanHero({ clan }: ClanHeroProps) {
  const heroImage =
    clan.tag === "#2JLLPVGUU"
      ? "/images/archives/tdg-main-archive.png"
      : clan.tag === "#2CVVG00QQ"
      ? "/images/archives/tdg-ii-archive.png"
      : clan.tag === "#2CQ2LGQJ2"
      ? "/images/archives/tdg-mini-archive.png"
      : "/images/archives/tdg-micro-archive.png";

  return (
    <section className="mb-8 overflow-hidden rounded-3xl border border-neutral-800 shadow-2xl">

      <img
        src={heroImage}
        alt={`${clan.name} Archives`}
        className="block w-full"
      />

      <div className="flex h-16 items-center justify-center gap-12 bg-neutral-950 px-8">

        <ClanHud clan={clan} />

      </div>

    </section>
  );
}