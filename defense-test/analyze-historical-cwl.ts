import { prisma } from "@/app/lib/prisma";

type PlayerDay = {
  round: number;
  mapPosition: number;
  townHall: number;
};

type Player = {
  tag: string;
  name: string;
  days: PlayerDay[];
};

function normalizeTag(tag: string): string {
  return tag.replace(/^#/, "").toUpperCase();
}

/*
|--------------------------------------------------------------------------
| DEFENSIVE STRENGTH
|--------------------------------------------------------------------------
|
| Basis:
|
| - positie bepaalt de structurele rangorde
| - stabiele posities geven meer onderscheid
| - veel positiewisselingen drukken scores naar elkaar toe
|
| Belangrijk:
|
| Defensive Strength zegt NIET dat een score een exact
| percentage sterkteverschil vertegenwoordigt.
|
| De score is een relatieve sterkte-indicatie binnen
| de betreffende CWL.
|
|--------------------------------------------------------------------------
*/

function calculateDefensiveStrength(
  players: Player[]
): Map<string, number> {
  const result = new Map<string, number>();

  if (players.length === 0) {
    return result;
  }

  /*
   * -----------------------------------------------------
   * 1. GEMIDDELDE POSITIE + STABILITEIT
   * -----------------------------------------------------
   */

  const data = players
    .map((player) => {
      const positions = player.days
        .map((day) => day.mapPosition)
        .filter((position) => position > 0);

      if (positions.length === 0) {
        return null;
      }

      const averagePosition =
        positions.reduce(
          (sum, position) => sum + position,
          0
        ) / positions.length;

      let changes = 0;

      for (let i = 1; i < positions.length; i++) {
        if (positions[i] !== positions[i - 1]) {
          changes++;
        }
      }

      const stability =
        positions.length > 1
          ? 1 -
            changes /
              (positions.length - 1)
          : 1;

      return {
        player,
        averagePosition,
        stability,
      };
    })
    .filter(
      (
        item
      ): item is {
        player: Player;
        averagePosition: number;
        stability: number;
      } => item !== null
    );

  if (data.length === 0) {
    return result;
  }

  /*
   * -----------------------------------------------------
   * 2. STRUCTURELE RANGORDE
   * -----------------------------------------------------
   *
   * De gemiddelde positie bepaalt primair de volgorde.
   *
   * Bij gelijke gemiddelde positie gebruiken we stabiliteit
   * alleen als secundaire factor.
   * -----------------------------------------------------
   */

  data.sort((a, b) => {
    if (
      a.averagePosition !==
      b.averagePosition
    ) {
      return (
        a.averagePosition -
        b.averagePosition
      );
    }

    return (
      b.stability -
      a.stability
    );
  });

  /*
   * -----------------------------------------------------
   * 3. BASISSCORE
   * -----------------------------------------------------
   *
   * Nummer 1 begint op 100.
   *
   * De afstand tussen spelers wordt kleiner wanneer
   * de posities onderling veel bewegen.
   *
   * Hierdoor geldt:
   *
   * veel positiewisselingen
   *      -> scores dichter bij elkaar
   *
   * stabiele posities
   *      -> duidelijker scoreverschil
   *
   * De score is dus GEEN letterlijk percentage.
   * -----------------------------------------------------
   */

  let previousScore = 100;
  let previousAverage =
    data[0].averagePosition;
  let previousStability =
    data[0].stability;

  result.set(
    data[0].player.tag,
    100
  );

  for (let i = 1; i < data.length; i++) {
    const current = data[i];

    const positionGap =
      Math.max(
        0,
        current.averagePosition -
          previousAverage
      );

    const averageStability =
      (current.stability +
        previousStability) /
      2;

    const baseGap =
      Math.max(
        1,
        positionGap * 4
      );

    const stabilityFactor =
      0.45 +
      averageStability * 0.55;

    const scoreGap =
      baseGap *
      stabilityFactor;

    const score = Math.max(
      0,
      Math.min(
        100,
        previousScore -
          scoreGap
      )
    );

    result.set(
      current.player.tag,
      Math.round(score)
    );

    previousScore = score;
    previousAverage =
      current.averagePosition;
    previousStability =
      current.stability;
  }

  return result;
}

/*
|--------------------------------------------------------------------------
| HANDMATIGE OVERRIDES
|--------------------------------------------------------------------------
|
| MAX:
| speler krijgt Defensive Strength 100.
|
| De override vervalt automatisch zodra TH19 is bereikt.
|
| We controleren daarvoor eerst de meest recente
| CwlPlayerSnapshot.
|
| Als daar geen snapshot voor bestaat, gebruiken we de
| hoogste TH die in de historische CWL-data aanwezig is.
|--------------------------------------------------------------------------
*/

async function getActiveOverrides(
  clanTag: string,
  players: Player[]
): Promise<
  Map<
    string,
    {
      type: "MAX";
      reason: string | null;
    }
  >
> {
  const result = new Map<
    string,
    {
      type: "MAX";
      reason: string | null;
    }
  >();

  const overrides =
    await prisma.cwlDefensiveStrengthOverride.findMany({
      where: {
        clanTag,
      },
    });

  if (overrides.length === 0) {
    return result;
  }

  for (const override of overrides) {
    const player =
      players.find(
        (item) =>
          item.tag ===
          normalizeTag(
            override.playerTag
          )
      );

    if (!player) {
      continue;
    }

    /*
     * ---------------------------------------------------
     * ACTUELE TH CONTROLEREN
     * ---------------------------------------------------
     *
     * We pakken de meest recente snapshot.
     */

    const latestSnapshot =
      await prisma.cwlPlayerSnapshot.findFirst({
        where: {
          playerTag:
            override.playerTag,
        },
        orderBy: {
          snapshotDate: "desc",
        },
      });

    let currentTownHall =
      latestSnapshot?.townHall ?? 0;

    /*
     * Als er geen snapshot bestaat, gebruiken we
     * de hoogste TH uit de historische data.
     */

    if (currentTownHall === 0) {
      currentTownHall =
        Math.max(
          ...player.days.map(
            (day) =>
              day.townHall
          )
        );
    }

    /*
     * ---------------------------------------------------
     * TH19 = OVERRIDE ONGELDIG
     * ---------------------------------------------------
     */

    if (currentTownHall >= 19) {
      console.log(
        `  ⚠️ Override vervalt: ${player.name} is TH${currentTownHall}`
      );

      /*
       * We verwijderen de override direct uit de database.
       *
       * Hierdoor hoeft hij ook later niet opnieuw
       * gecontroleerd te worden.
       */

      await prisma.cwlDefensiveStrengthOverride.delete({
        where: {
          clanTag_playerTag: {
            clanTag,
            playerTag:
              override.playerTag,
          },
        },
      });

      continue;
    }

    if (override.type === "MAX") {
      result.set(
        player.tag,
        {
          type: "MAX",
          reason:
            override.reason,
        }
      );
    }
  }

  return result;
}

async function main() {
  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    " HISTORISCHE CWL DEFENSIVE STRENGTH"
  );
  console.log(
    "========================================"
  );
  console.log("");

  const wars =
    await prisma.cwlHistoricalWar.findMany({
      orderBy: [
        { round: "asc" },
        { warTag: "asc" },
      ],
      include: {
        players: true,
      },
    });

  console.log(
    `Historische wars gevonden: ${wars.length}`
  );

  if (wars.length === 0) {
    throw new Error(
      "Geen historische CWL-data gevonden."
    );
  }

  /*
   * -----------------------------------------------------
   * CLANS
   * -----------------------------------------------------
   */

  const clans = new Map<
    string,
    typeof wars
  >();

  for (const war of wars) {
    const tag =
      normalizeTag(war.clanTag);

    const existing =
      clans.get(tag);

    if (existing) {
      existing.push(war);
    } else {
      clans.set(tag, [war]);
    }
  }

  console.log(
    `TDG-clans gevonden: ${clans.size}`
  );

  /*
   * -----------------------------------------------------
   * ANALYSE PER CLAN
   * -----------------------------------------------------
   */

  for (const [clanTag, clanWars] of clans) {
    console.log("");
    console.log(
      "========================================"
    );
    console.log(
      ` CLAN: #${clanTag}`
    );
    console.log(
      "========================================"
    );

    const players =
      new Map<
        string,
        Player
      >();

    /*
     * ---------------------------------------------------
     * SPELERS SAMENVOEGEN
     * ---------------------------------------------------
     */

    for (const war of clanWars) {
      for (const player of war.players) {
        const tag =
          normalizeTag(
            player.playerTag
          );

        if (!players.has(tag)) {
          players.set(tag, {
            tag,
            name: player.name,
            days: [],
          });
        }

        players
          .get(tag)!
          .days.push({
            round: war.round,
            mapPosition:
              player.mapPosition,
            townHall:
              player.townHall,
          });
      }
    }

    /*
     * ---------------------------------------------------
     * AUTOMATISCHE SCORE
     * ---------------------------------------------------
     */

    const scores =
      calculateDefensiveStrength(
        [...players.values()]
      );

    /*
     * ---------------------------------------------------
     * OVERRIDES OPHALEN
     * ---------------------------------------------------
     */

    const overrides =
      await getActiveOverrides(
        clanTag,
        [...players.values()]
      );

    /*
     * ---------------------------------------------------
     * OVERRIDES TOEPASSEN
     * ---------------------------------------------------
     */

    for (const [
      playerTag,
      override,
    ] of overrides) {
      if (
        override.type ===
        "MAX"
      ) {
        scores.set(
          playerTag,
          100
        );
      }
    }

    /*
     * ---------------------------------------------------
     * OUTPUT
     * ---------------------------------------------------
     */

    const ranked =
      [...players.values()]
        .sort((a, b) => {
          const scoreDifference =
            (scores.get(
              b.tag
            ) ?? 0) -
            (scores.get(
              a.tag
            ) ?? 0);

          if (
            scoreDifference !== 0
          ) {
            return scoreDifference;
          }

          /*
           * Bij gelijke score gebruiken we
           * gemiddelde positie als tie-breaker.
           */

          const aAverage =
            a.days.reduce(
              (sum, day) =>
                sum +
                day.mapPosition,
              0
            ) /
            a.days.length;

          const bAverage =
            b.days.reduce(
              (sum, day) =>
                sum +
                day.mapPosition,
              0
            ) /
            b.days.length;

          return (
            aAverage -
            bAverage
          );
        });

    console.log("");
    console.log(
      "----------------------------------------"
    );
    console.log(
      " DEFENSIVE STRENGTH"
    );
    console.log(
      "----------------------------------------"
    );
    console.log("");

    ranked.forEach(
      (player, index) => {
        const positions =
          player.days
            .sort(
              (a, b) =>
                a.round -
                b.round
            )
            .map(
              (day) =>
                day.mapPosition
            );

        const changes =
          positions.reduce(
            (
              count,
              position,
              i
            ) => {
              if (i === 0) {
                return count;
              }

              return position !==
                positions[i - 1]
                ? count + 1
                : count;
            },
            0
          );

        const stability =
          positions.length > 1
            ? Math.round(
                (1 -
                  changes /
                    (positions.length -
                      1)) *
                  100
              )
            : 100;

        const average =
          positions.reduce(
            (sum, position) =>
              sum + position,
            0
          ) /
          positions.length;

        const override =
          overrides.get(
            player.tag
          );

        const overrideText =
          override?.type ===
          "MAX"
            ? " | OVERRIDE: MAX"
            : "";

        console.log(
          `${String(
            index + 1
          ).padStart(
            2,
            " "
          )}. ${String(
            scores.get(
              player.tag
            ) ?? 0
          ).padStart(
            3,
            " "
          )} | ${
            player.name
          } | ${
            player.tag
          }${overrideText}`
        );

        console.log(
          `    Posities: ${positions.join(
            " → "
          )}`
        );

        console.log(
          `    Gem. positie: ${average.toFixed(
            2
          )}`
        );

        console.log(
          `    Positiewijzigingen: ${changes}`
        );

        console.log(
          `    Stabiliteit: ${stability}%`
        );

        if (
          override?.reason
        ) {
          console.log(
            `    Override reden: ${override.reason}`
          );
        }

        console.log("");
      }
    );

    /*
     * ---------------------------------------------------
     * POSITIE PER DAG
     * ---------------------------------------------------
     */

    console.log(
      "----------------------------------------"
    );
    console.log(
      " POSITIE PER DAG"
    );
    console.log(
      "----------------------------------------"
    );
    console.log("");

    const positionOrder =
      [...players.values()]
        .sort((a, b) => {
          const aAverage =
            a.days.reduce(
              (sum, day) =>
                sum +
                day.mapPosition,
              0
            ) /
            a.days.length;

          const bAverage =
            b.days.reduce(
              (sum, day) =>
                sum +
                day.mapPosition,
              0
            ) /
            b.days.length;

          return (
            aAverage -
            bAverage
          );
        });

    for (
      const player of
      positionOrder
    ) {
      const positions =
        Array.from(
          { length: 7 },
          (_, index) => {
            const day =
              player.days.find(
                (item) =>
                  item.round ===
                  index + 1
              );

            return day
              ? String(
                  day.mapPosition
                ).padStart(
                  2,
                  " "
                )
              : "--";
          }
        );

      const override =
        overrides.get(
          player.tag
        );

      const overrideText =
        override?.type === "MAX"
          ? " [MAX]"
          : "";

      console.log(
        `${player.name.padEnd(
          25
        )} | ${positions.join(
          " | "
        )} | DS ${String(
          scores.get(
            player.tag
          ) ?? 0
        ).padStart(
          3,
          " "
        )}${overrideText}`
      );
    }
  }

  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    " ANALYSE KLAAR"
  );
  console.log(
    "========================================"
  );
  console.log("");
}

main()
  .catch((error) => {
    console.error("");
    console.error(
      "🔥 ANALYSE FOUT:"
    );
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });