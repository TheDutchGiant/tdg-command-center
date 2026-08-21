import { prisma } from "@/app/lib/prisma";

export async function getCwlStatsAttacks(clanId: number) {
  return prisma.attack.findMany({
    where: {
      isOwnAttack: true,
      war: {
        clanId,
        isFinalized: true,
      },
    },
    include: {
      player: true,
    },
    orderBy: {
      id: "asc",
    },
  });
}
