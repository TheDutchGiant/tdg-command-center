import { prisma } from "@/app/lib/prisma";
import {
  generateRandomArmy,
  type Difficulty,
} from "./randomArmy";

const CHALLENGE_DURATION_DAYS = 7;

const DIFFICULTIES: Difficulty[] = [
  "OH_MY_GOD",
  "OH_HELL_NO",
  "FUCK_MY_LIFE",
];

const TOWN_HALLS = [13, 14, 15, 16, 17, 18];

function randomItem<T>(items: T[]): T {
  return items[
    Math.floor(Math.random() * items.length)
  ];
}

export async function ensureActiveChallenge() {
  const now = new Date();

  const active =
    await prisma.randomChallenge.findFirst({
      where: {
        status: "ACTIVE",
        startsAt: {
          lte: now,
        },
        OR: [
          { endsAt: null },
          { endsAt: { gt: now } },
        ],
      },
      orderBy: {
        number: "desc",
      },
    });

  if (active) {
    return active;
  }

  const latest =
    await prisma.randomChallenge.findFirst({
      orderBy: {
        number: "desc",
      },
    });

  const townHall =
    randomItem(TOWN_HALLS);

  const difficulty =
    randomItem(DIFFICULTIES);

  const army =
    await generateRandomArmy(
      townHall,
      difficulty
    );

  const bases =
    await prisma.base.findMany({
      where: {
        townHall,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  const base =
    bases.length > 0
      ? randomItem(bases)
      : null;

  const startsAt = now;

  const endsAt = new Date(
    now.getTime() +
      CHALLENGE_DURATION_DAYS *
        24 *
        60 *
        60 *
        1000
  );

  return prisma.randomChallenge.create({
    data: {
      number:
        (latest?.number ?? 0) + 1,

      title:
        `TDG Random Army Challenge #${
          (latest?.number ?? 0) + 1
        }`,

      status: "ACTIVE",

      townHall,

      difficulty,

      baseId:
        base?.id ?? null,

      army,

      rules:
        "Iedere deelnemer gebruikt exact dezelfde random army en dezelfde challenge-base. Eén geldige inzending per speler.",

      startsAt,

      endsAt,
    },
  });
}
