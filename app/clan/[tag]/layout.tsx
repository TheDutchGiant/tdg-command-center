import ClanHero from "@/app/components/ClanHero";
import ClanNavigation from "@/app/components/ClanNavigation";
import ScrollToTop from "@/app/components/ScrollToTop";
import { prisma } from "@/app/lib/prisma";
import { getCwlPromotionPosition } from "@/app/actions/cwlActions";
import { getCwlPrediction } from "@/app/actions/cwlPredictionActions";

export default async function ClanLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;

  const res = await fetch(
    `http://localhost:3000/api/clan/${tag}`,
    {
      cache: "no-store",
    }
  );

  const clan = await res.json();

  if (clan.error) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <h1 className="text-2xl font-bold">
          Clan niet gevonden.
        </h1>
      </main>
    );
  }

  let promotion = null;
  let prediction = null;

  const normalizedTag = tag.startsWith("#")
    ? tag
    : `#${tag}`;

  const latestCwlMatchup =
    await prisma.cwlMatchup.findFirst({
      where: {
        OR: [
          {
            clanATag: normalizedTag,
          },
          {
            clanBTag: normalizedTag,
          },
          {
            clanATag:
              normalizedTag.replace("#", ""),
          },
          {
            clanBTag:
              normalizedTag.replace("#", ""),
          },
        ],
      },
      orderBy: [
        {
          season: "desc",
        },
        {
          round: "desc",
        },
      ],
    });

  if (latestCwlMatchup?.season) {
    const leagueName =
      clan.warLeague?.name ?? "";

    promotion =
      await getCwlPromotionPosition(
        latestCwlMatchup.season,
        normalizedTag,
        leagueName
      );

    prediction =
      await getCwlPrediction(
        latestCwlMatchup.season,
        normalizedTag,
        leagueName
      );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <ScrollToTop />

      <div className="relative mx-auto max-w-7xl p-8">
        <ClanHero
          clan={clan}
          promotion={promotion}
          prediction={prediction}
        />

        <ClanNavigation tag={tag} />

        {children}
      </div>
    </main>
  );
}
