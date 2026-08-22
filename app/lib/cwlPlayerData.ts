import { prisma } from "@/app/lib/prisma";

export type CwlAttackScore = {
  warTag: string;
  round: number;
  playerTag: string;
  playerName: string;
  attackerTownHall: number;
  defenderTag: string;
  defenderName: string;
  defenderTownHall: number;
  stars: number;
  destruction: number;
  score: number;
};

export type RegularWarAttackScore = {
  warTag: string;
  playerTag: string;
  playerName: string;
  attackNumber: number;
  attackerTownHall: number;
  defenderName: string;
  defenderTownHall: number;
  stars: number;
  destruction: number;
  score: number;
};

export type RegularWarHistory = {
  wars: number;
  attacks: number;
  missedAttacks: number;
  score: number;
  attackScores: RegularWarAttackScore[];
};

export type CwlHistory = {
  wars: number;
  attacks: number;
  score: number;
  attackScores: CwlAttackScore[];
};

export type CwlPlayerScore = {
  playerTag: string;
  playerName: string;

  cwlScore: number;
  regularWarScore: number;
  defensiveWeight: number;

  totalScore: number;

  cwl: CwlHistory;
  regularWar: RegularWarHistory;

  regularWarDataConfidence:
    | "NONE"
    | "LIMITED"
    | "GOOD";

  manualReview: boolean;
  manualReviewReasons: string[];
};

function normalizeTag(tag: string) {
  return tag.replace(/^#/, "").toUpperCase();
}

/*
 * ============================================================
 * CWL SCORE
 * ============================================================
 *
 * CWL is de belangrijkste prestatiecomponent.
 *
 * Iedere aanval wordt beoordeeld op:
 *
 * - eigen TH
 * - tegenstander TH
 * - sterren
 *
 * Een lagere TH die tegen een veel hogere TH aanvalt
 * wordt daardoor eerlijker beoordeeld.
 */

function getCwlAttackScore(
  stars: number,
  _attackerTownHall: number,
  _defenderTownHall: number
): number {
  /*
   * ---------------------------------------------------------
   * CWL OFFENCE
   * ---------------------------------------------------------
   *
   * 100 punten per behaalde ster.
   *
   * 3 sterren = 300 punten
   * 2 sterren = 200 punten
   * 1 ster   = 100 punten
   * 0 sterren = 0 punten
   *
   * Maximale CWL offence:
   * 7 wars × 3 sterren × 100 = 2100 punten.
   *
   * Town Hall verschil wordt hier bewust niet meer
   * als scoremodifier gebruikt. De volledige aanvalshistorie
   * blijft beschikbaar voor de gedetailleerde beoordeling.
   */

  return Math.max(
    0,
    Math.min(3, stars)
  ) * 100;
}

/*
 * ============================================================
 * REGULAR CW SCORE
 * ============================================================
 */

function getRegularAttackScore(
  stars: number,
  attackerTownHall: number,
  defenderTownHall: number
): number {
  const difference =
    defenderTownHall - attackerTownHall;

  if (stars >= 3) {
    if (difference >= 4) return 1200;
    if (difference === 3) return 1150;
    if (difference === 2) return 1100;
    if (difference === 1) return 1050;
    if (difference === 0) return 1000;
    if (difference === -1) return 950;
    return 900;
  }

  if (stars === 2) {
    if (difference >= 4) return 1150;
    if (difference === 3) return 1100;
    if (difference === 2) return 1050;
    if (difference === 1) return 1000;
    if (difference === 0) return 950;
    if (difference === -1) return 875;
    return 800;
  }

  if (stars === 1) {
    if (difference >= 4) return 1000;
    if (difference === 3) return 1000;
    if (difference === 2) return 950;
    if (difference === 1) return 900;
    if (difference === 0) return 850;
    if (difference === -1) return 675;
    return 500;
  }

  if (difference >= 4) return 900;
  if (difference === 3) return 875;
  if (difference === 2) return 800;
  if (difference === 1) return 725;
  if (difference === 0) return 650;
  if (difference === -1) return 400;
  return 250;
}

const MISSED_ATTACK_PENALTY = 1500;

/*
 * ============================================================
 * CWL HISTORIE
 * ============================================================
 */

export async function getCwlHistory(
  playerTag: string
): Promise<CwlHistory> {
  const normalizedTag =
    normalizeTag(playerTag);

  const players =
    await prisma.cwlHistoricalPlayer.findMany({
      where: {
        OR: [
          {
            playerTag: normalizedTag,
          },
          {
            playerTag: `#${normalizedTag}`,
          },
        ],
      },
      include: {
        war: true,
      },
      orderBy: {
        war: {
          round: "asc",
        },
      },
    });

  const attackScores: CwlAttackScore[] = [];

  /*
   * Historische spelers per war.
   *
   * De Clash API snapshot bevat niet altijd alle
   * opponent.members. De CwlHistoricalPlayer-tabel
   * bevat echter wel de historische spelers van die war.
   *
   * Daardoor kunnen we een defender alsnog reconstrueren
   * wanneer deze niet meer in opponent.members staat.
   */
  const historicalPlayersByWar =
    new Map<
      string,
      Map<string, (typeof players)[number]>
    >();

  for (const player of players) {
    const warTag =
      player.war.warTag;

    if (
      !historicalPlayersByWar.has(
        warTag
      )
    ) {
      historicalPlayersByWar.set(
        warTag,
        new Map()
      );
    }

    historicalPlayersByWar
      .get(warTag)!
      .set(
        normalizeTag(player.playerTag),
        player
      );
  }

  for (const player of players) {
    const rawAttacks =
      Array.isArray(player.attacks)
        ? player.attacks
        : [];

    const rawWarData =
      player.war.rawData as any;

    const opponentMembers =
      rawWarData?.opponent?.members ??
      [];

    const clanMembers =
      rawWarData?.clan?.members ??
      [];

    const historicalPlayers =
      historicalPlayersByWar.get(
        player.war.warTag
      ) ??
      new Map();

    for (const rawAttackValue of rawAttacks) {
      if (!rawAttackValue || typeof rawAttackValue !== "object" || Array.isArray(rawAttackValue)) continue;
      const rawAttack = rawAttackValue as Record<string, any>;
      const defenderTag =
        normalizeTag(
          rawAttack.defenderTag ?? ""
        );

      const defenderFromSnapshot =
        opponentMembers.find(
          (member: any) =>
            normalizeTag(
              member.tag ?? ""
            ) === defenderTag
        );

      const defenderFromClanSnapshot =
        clanMembers.find(
          (member: any) =>
            normalizeTag(
              member.tag ?? ""
            ) === defenderTag
        );

      const defenderFromHistory =
        historicalPlayers.get(
          defenderTag
        );

      const defender =
        defenderFromSnapshot ??
        defenderFromClanSnapshot ??
        defenderFromHistory;

      const attackerTownHall =
        Number(
          player.townHall ?? 0
        );

      const defenderTownHall =
        Number(
          defender?.townhallLevel ?? 0
        );

      const stars =
        Number(
          rawAttack.stars ?? 0
        );

      attackScores.push({
        warTag:
          player.war.warTag,

        round:
          player.war.round,

        playerTag:
          normalizedTag,

        playerName:
          player.name,

        attackerTownHall,

        defenderTag,

        defenderName:
          defender?.name ?? "",

        defenderTownHall,

        stars,

        destruction:
          Number(
            rawAttack.destructionPercentage ??
            0
          ),

        score:
          getCwlAttackScore(
            stars,
            attackerTownHall,
            defenderTownHall
          ),
      });
    }
  }

  return {
    wars: new Set(
      players.map(
        (player) =>
          player.war.warTag
      )
    ).size,

    attacks:
      attackScores.length,

    score:
      attackScores.reduce(
        (total, attack) =>
          total + attack.score,
        0
      ),

    attackScores,
  };
}

/*
 * ============================================================
 * GEWONE CW HISTORIE
 * ============================================================
 */

export async function getRegularWarHistory(
  playerTag: string
): Promise<RegularWarHistory> {
  const normalizedTag =
    normalizeTag(playerTag);

  const attacks =
    await prisma.regularWarAttack.findMany({
      where: {
        playerTag: normalizedTag,
      },
      orderBy: [
        {
          createdAt: "desc",
        },
        {
          attackNumber: "asc",
        },
      ],
    });

  const players =
    await prisma.regularWarPlayer.findMany({
      where: {
        playerTag: normalizedTag,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  const missedAttacks =
    players.reduce(
      (total, player) =>
        total +
        Math.max(
          player.missedAttacks ?? 0,
          0
        ),
      0
    );

  const attackScores =
    attacks.map((attack) => ({
      warTag:
        attack.warTag,

      playerTag:
        attack.playerTag,

      playerName:
        attack.playerName,

      attackNumber:
        attack.attackNumber,

      attackerTownHall:
        attack.attackerTownHall,

      defenderName:
        attack.defenderName,

      defenderTownHall:
        attack.defenderTownHall,

      stars:
        attack.stars,

      destruction:
        attack.destruction,

      score:
        getRegularAttackScore(
          attack.stars,
          attack.attackerTownHall,
          attack.defenderTownHall
        ),
    }));

  const attackScore =
    attackScores.reduce(
      (total, attack) =>
        total + attack.score,
      0
    );

  return {
    wars: new Set(
      attacks.map(
        (attack) =>
          attack.warTag
      )
    ).size,

    attacks:
      attackScores.length,

    missedAttacks,

    score:
      attackScore -
      missedAttacks *
        MISSED_ATTACK_PENALTY,

    attackScores,
  };
}

/*
 * ============================================================
 * TOTAALSCORE
 * ============================================================
 *
 * CWL is bewust zwaarder dan gewone CW.
 *
 * De CWL-score krijgt 75%.
 * Gewone CW krijgt 25%.
 *
 * Defensive Strength staat daar los van.
 */

export function calculateTotalCwlScore(
  cwlScore: number,
  regularWarScore: number,
  defensiveWeight: number
): number {
  const weightedCwl =
    cwlScore * 0.75;

  const weightedRegular =
    regularWarScore * 0.25;

  return Number(
    (
      weightedCwl +
      weightedRegular +
      defensiveWeight
    ).toFixed(2)
  );
}

/*
 * ============================================================
 * VOLLEDIGE SPELERBEOORDELING
 * ============================================================
 */

export async function getCwlPlayerScore(
  playerTag: string,
  defensiveWeight = 0
): Promise<CwlPlayerScore> {
  const normalizedTag =
    normalizeTag(playerTag);

  const [
    cwl,
    regularWar,
    player,
  ] = await Promise.all([
    getCwlHistory(normalizedTag),

    getRegularWarHistory(
      normalizedTag
    ),

    prisma.player.findUnique({
      where: {
        playerTag:
          normalizedTag,
      },
    }),
  ]);

  const regularWarDataConfidence =
    regularWar.wars === 0
      ? "NONE"
      : regularWar.wars < 3
        ? "LIMITED"
        : "GOOD";

  const manualReviewReasons: string[] =
    [];

  if (
    regularWarDataConfidence !==
    "GOOD"
  ) {
    manualReviewReasons.push(
      "Beperkte gewone-CW-data"
    );
  }

  if (
    cwl.attacks === 0
  ) {
    manualReviewReasons.push(
      "Geen CWL-aanvallen beschikbaar"
    );
  }

  const totalScore =
    calculateTotalCwlScore(
      cwl.score,
      regularWar.score,
      defensiveWeight
    );

  return {
    playerTag:
      normalizedTag,

    playerName:
      player?.currentName ??
      normalizedTag,

    cwlScore:
      cwl.score,

    regularWarScore:
      regularWar.score,

    defensiveWeight,

    totalScore,

    cwl,

    regularWar,

    regularWarDataConfidence,

    manualReview:
      manualReviewReasons.length >
      0,

    manualReviewReasons,
  };
}
