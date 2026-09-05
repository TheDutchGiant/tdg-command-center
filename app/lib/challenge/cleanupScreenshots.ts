import { prisma } from "@/app/lib/prisma";
import fs from "node:fs/promises";
import path from "node:path";

export async function cleanupExpiredChallengeScreenshots() {
  const now = new Date();

  const expiredChallenges =
    await prisma.randomChallenge.findMany({
      where: {
        endsAt: {
          lt: now,
        },
      },
      select: {
        id: true,
        endsAt: true,
      },
    });

  const baseDirectory = path.join(
    process.cwd(),
    "public",
    "uploads",
    "random-challenge",
  );

  let removed = 0;

  for (const challenge of expiredChallenges) {
    const directory = path.join(
      baseDirectory,
      String(challenge.id),
    );

    try {
      await fs.rm(directory, {
        recursive: true,
        force: true,
      });

      removed += 1;
    } catch (error) {
      console.error(
        `Challenge ${challenge.id} screenshots konden niet worden verwijderd:`,
        error,
      );
    }
  }

  /*
   * BELANGRIJK:
   *
   * Alleen de bestanden worden verwijderd.
   * RandomChallengeResult blijft volledig intact.
   *
   * Daardoor blijven:
   * - ⭐ sterren
   * - 💥 destruction
   * - ⏱️ tijd
   * - score
   * - rank
   * - speler
   *
   * beschikbaar voor Leaderboard, Hall of Fame
   * en de statistiekenpagina.
   */

  return {
    expiredChallenges: expiredChallenges.length,
    removed,
  };
}
