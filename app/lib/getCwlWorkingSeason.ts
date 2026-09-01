import { checkForNewCWL } from "@/app/lib/checkForNewCWL";
import { prisma } from "@/app/lib/prisma";

export async function getCwlWorkingSeason(): Promise<string> {
  const cwl = await checkForNewCWL();

  // Clash geeft een actieve CWL terug.
  if (cwl.active && cwl.league?.season) {
    return cwl.league.season;
  }

  /*
   * Clash kan rond de overgang naar een nieuwe CWL tijdelijk
   * geen leaguegroup teruggeven. Een bestaande FINAL-selectie
   * mag daardoor niet verdwijnen.
   *
   * Gebruik daarom het meest recente FINAL-plan als fallback.
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

  // Geen bestaande CWL-selectie: nieuwe voorbereidingsmaand.
  return new Date()
    .toISOString()
    .slice(0, 7);
}
