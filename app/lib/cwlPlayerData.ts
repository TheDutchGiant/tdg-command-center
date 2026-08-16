import { prisma } from "@/app/lib/prisma";
import { fetchClash } from "@/app/lib/clash";
import { PHOENIX } from "@/app/lib/config";

export type CwlPlayerSnapshotType =
  | "OWN_CLAN"
  | "OPPONENT";

export type CwlPlayerSnapshot = {
  playerTag: string;
  name: string;
  townHall: number;
  experienceLevel: number;
  attackWins: number;
  defenseWins: number;
  trophies: number;
  warStars: number;
  builderHall: number | null;
  snapshotDate: Date;
};

/*
 * Haal actuele spelerinformatie op
 * via de Clash Player API.
 */
export async function fetchCwlPlayerSnapshot(
  playerTag: string
): Promise<CwlPlayerSnapshot> {
  const tag = playerTag.replace("#", "");

  const data = await fetchClash(
    `/players/%23${tag}`
  );

  return {
    playerTag: data.tag,
    name: data.name,
    townHall: data.townHallLevel,
    experienceLevel: data.expLevel ?? 0,
    attackWins: data.attackWins ?? 0,
    defenseWins: data.defenseWins ?? 0,
    trophies: data.trophies ?? 0,
    warStars: data.warStars ?? 0,
    builderHall:
      data.builderHallLevel ?? null,
    snapshotDate: new Date(),
  };
}

/*
 * Sla één speler-snapshot op.
 */
export async function saveCwlPlayerSnapshot(
  playerTag: string,
  snapshotType: CwlPlayerSnapshotType
): Promise<CwlPlayerSnapshot> {
  const snapshot =
    await fetchCwlPlayerSnapshot(
      playerTag
    );

  await prisma.cwlPlayerSnapshot.create({
    data: {
      ...snapshot,
      snapshotType,
    },
  });

  return snapshot;
}

/*
 * Haal alle unieke verdedigers uit
 * de meest recente CWL-season.
 *
 * Dit gebruikt de reeds opgeslagen
 * defenderTag uit de CWL-aanvallen.
 */
export async function getLastCwlOpponentTags(): Promise<
  string[]
> {
  const latestWar =
    await prisma.war.findFirst({
      orderBy: {
        warEndTime: "desc",
      },
    });

  if (!latestWar) {
    return [];
  }

  const latestCwlSeason =
    await prisma.season.findFirst({
      where: {
        id: latestWar.seasonId,
      },
    });

  if (!latestCwlSeason) {
    return [];
  }

  const wars =
    await prisma.war.findMany({
      where: {
        seasonId:
          latestCwlSeason.id,
      },
      select: {
        warTag: true,
      },
    });

  const warTags =
    wars.map(
      (war) => war.warTag
    );

  if (warTags.length === 0) {
    return [];
  }

  const attacks =
    await prisma.attack.findMany({
      where: {
        warTag: {
          in: warTags,
        },
      },
      select: {
        defenderTag: true,
      },
    });

  const opponentTags =
    new Set<string>();

  for (const attack of attacks) {
    if (!attack.defenderTag) {
      continue;
    }

    opponentTags.add(
      attack.defenderTag
    );
  }

  return Array.from(
    opponentTags
  );
}

/*
 * Haal de actuele spelers van alle
 * TDG-clans op.
 *
 * Eén speler die eventueel dubbel
 * voorkomt wordt maar één keer
 * verwerkt.
 */
export async function getOwnClanPlayerTags(): Promise<
  string[]
> {
  const playerTags =
    new Set<string>();

  for (const clan of PHOENIX.clans) {
    const data =
      await fetchClash(
        `/clans/%23${clan.tag.replace(
          "#",
          ""
        )}`
      );

    for (const member of
      data.memberList ?? []) {
      if (member.tag) {
        playerTags.add(
          member.tag
        );
      }
    }
  }

  return Array.from(
    playerTags
  );
}

/*
 * Sla alle eigen TDG-spelers op
 * als OWN_CLAN snapshot.
 */
export async function saveOwnClanPlayerSnapshots() {
  const playerTags =
    await getOwnClanPlayerTags();

  let saved = 0;
  let failed = 0;

  for (const playerTag of playerTags) {
    try {
      await saveCwlPlayerSnapshot(
        playerTag,
        "OWN_CLAN"
      );

      saved++;
    } catch (error) {
      failed++;

      console.error(
        `TDG player snapshot failed for ${playerTag}:`,
        error
      );
    }
  }

  return {
    total: playerTags.length,
    saved,
    failed,
  };
}

/*
 * Sla alle bekende tegenstanders van
 * de laatste CWL op.
 */
export async function saveLastCwlOpponentSnapshots() {
  const opponentTags =
    await getLastCwlOpponentTags();

  let saved = 0;
  let failed = 0;

  for (const playerTag of opponentTags) {
    try {
      await saveCwlPlayerSnapshot(
        playerTag,
        "OPPONENT"
      );

      saved++;
    } catch (error) {
      failed++;

      console.error(
        `CWL opponent snapshot failed for ${playerTag}:`,
        error
      );
    }
  }

  return {
    total: opponentTags.length,
    saved,
    failed,
  };
}