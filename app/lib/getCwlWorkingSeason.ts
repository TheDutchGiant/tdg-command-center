import { checkForNewCWL } from "@/app/lib/checkForNewCWL";
import { prisma } from "@/app/lib/prisma";

function previousMonth(season: string): string {
  const [year, month] = season.split("-").map(Number);

  if (month === 1) {
    return `${year - 1}-12`;
  }

  return `${year}-${String(month - 1).padStart(2, "0")}`;
}

export async function getCwlWorkingSeason(): Promise<string> {
  const cwl = await checkForNewCWL();

  /*
   * Clash CWL 2026-09-01 hoort bij de TDG-selectie
   * die in augustus is samengesteld: 2026-08.
   */
  if (cwl.active && cwl.league?.season) {
    const cwlSeason = cwl.league.season.slice(0, 7);
    const planSeason = previousMonth(cwlSeason);

    const finalPlan = await prisma.cwlPlan.findUnique({
      where: {
        season: planSeason,
      },
      select: {
        season: true,
        status: true,
      },
    });

    if (finalPlan?.status === "FINAL") {
      return finalPlan.season;
    }

    const latestFinal = await prisma.cwlPlan.findFirst({
      where: {
        status: "FINAL",
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        season: true,
      },
    });

    if (latestFinal?.season) {
      return latestFinal.season;
    }
  }

  /*
   * Geen actieve leaguegroup betekent niet automatisch
   * dat de huidige CWL voorbij is.
   */
  const finalPlan = await prisma.cwlPlan.findFirst({
    where: {
      status: "FINAL",
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      season: true,
    },
  });

  if (finalPlan?.season) {
    return finalPlan.season;
  }

  return new Date().toISOString().slice(0, 7);
}
