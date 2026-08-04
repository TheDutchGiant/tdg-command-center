import { prisma } from "@/app/lib/prisma";

export async function saveSeason(apiSeason: string) {
  const season = apiSeason.substring(0, 7);

  return await prisma.season.upsert({
    where: {
      season,
    },
    update: {},
    create: {
      season,
    },
  });
}