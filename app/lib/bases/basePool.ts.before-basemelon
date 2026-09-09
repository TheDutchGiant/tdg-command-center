import { prisma } from "@/app/lib/prisma";

const BASE_CATALOG_URL =
  "https://raw.githubusercontent.com/nschmeller/clash-bases/main/bases.json";

const DEFAULT_IMPORT_COUNT = 10;
const MAX_BASE_AGE_DAYS = 7;

type RemoteBase = {
  id?: string;
  name?: string;
  town_hall?: number;
  type?: string;
  link?: string;
  image?: string;
  description?: string;
  builder?: string;
  tags?: string[];
  added?: string;
};

type RemoteCatalog = {
  bases?: RemoteBase[];
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [
      copy[swap],
      copy[index],
    ];
  }

  return copy;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function looksLikeShowBase(base: RemoteBase): boolean {
  const text = [
    base.name ?? "",
    base.description ?? "",
    ...(Array.isArray(base.tags) ? base.tags : []),
  ]
    .join(" ")
    .toLowerCase();

  const blockedTerms = [
    "showbase",
    "show base",
    "funbase",
    "fun base",
    "trollbase",
    "troll base",
    "artbase",
    "art base",
    "pixel",
    "farming",
    "farm base",
    "progress base",
    "progression",
  ];

  return blockedTerms.some((term) =>
    text.includes(term),
  );
}

async function fetchCatalog(): Promise<RemoteBase[]> {
  const response = await fetch(BASE_CATALOG_URL, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent": "TDG-Phoenix/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Base catalogus gaf HTTP ${response.status} terug.`,
    );
  }

  const data = (await response.json()) as RemoteCatalog;

  if (!Array.isArray(data.bases)) {
    throw new Error(
      "Base catalogus bevat geen geldige bases-array.",
    );
  }

  return data.bases;
}

export async function refreshBasePool(
  townHall = 18,
  count = DEFAULT_IMPORT_COUNT,
) {
  const now = new Date();

  const oldestAllowed = new Date(
    now.getTime() -
      MAX_BASE_AGE_DAYS *
        24 *
        60 *
        60 *
        1000,
  );

  /*
   * Oude community-bases mogen niet blijven meetellen
   * als beschikbare pool.
   */
  await prisma.base.updateMany({
    where: {
      townHall,
      createdBy: "Community Base Library",
      OR: [
        {
          createdAt: {
            lt: oldestAllowed,
          },
        },
        {
          isActive: false,
          expiresAt: {
            not: null,
            lte: now,
          },
        },
      ],
    },
    data: {
      isActive: false,
    },
  });

  const existing = await prisma.base.findMany({
    where: {
      townHall,
      createdBy: "Community Base Library",
    },
    select: {
      baseLink: true,
    },
  });

  const existingLinks = new Set(
    existing.map((base) => base.baseLink),
  );

  const catalog = await fetchCatalog();

  /*
   * Alleen entries waarvan de bron zelf een recente
   * datum opgeeft, mogen in de Challenge-pool.
   */
  const recentCandidates = catalog
    .filter((base) => {
      if (base.town_hall !== townHall) {
        return false;
      }

      if (
        !base.link ||
        !base.image ||
        !base.name
      ) {
        return false;
      }

      if (existingLinks.has(base.link)) {
        return false;
      }

      const added = parseDate(base.added);

      if (!added) {
        return false;
      }

      if (added < oldestAllowed) {
        return false;
      }

      if (looksLikeShowBase(base)) {
        return false;
      }

      const type = String(
        base.type ?? "",
      ).toLowerCase();

      return (
        type === "war" ||
        type === "hybrid" ||
        type === "trophy"
      );
    });

  /*
   * Meest recent eerst.
   * Binnen dezelfde datum houden we random variatie.
   */
  const sorted = [...recentCandidates].sort(
    (a, b) => {
      const aDate = parseDate(a.added)?.getTime() ?? 0;
      const bDate = parseDate(b.added)?.getTime() ?? 0;

      return bDate - aDate;
    },
  );

  const freshPool: RemoteBase[] = [];

  for (const base of sorted) {
    if (
      freshPool.length >= count
    ) {
      break;
    }

    freshPool.push(base);
  }

  /*
   * Kleine randomisering zodat dezelfde topbase niet
   * elke week automatisch bovenaan eindigt.
   */
  const selected = shuffle(
    freshPool,
  );

  if (!selected.length) {
    console.warn(
      `[BASE-POOL] Geen recente TH${townHall}-bases ≤ ${MAX_BASE_AGE_DAYS} dagen gevonden.`,
    );

    return {
      imported: 0,
      catalogCandidates: recentCandidates.length,
      maxAgeDays: MAX_BASE_AGE_DAYS,
    };
  }

  await prisma.base.createMany({
    data: selected.map((base) => ({
      townHall,
      category: "Challenge",
      name: base.name!.trim(),
      description: [
        base.description?.trim(),
        base.builder
          ? `Builder: ${base.builder.trim()}`
          : null,
        Array.isArray(base.tags) &&
        base.tags.length
          ? `Tags: ${base.tags.join(", ")}`
          : null,
        base.added
          ? `Bron toegevoegd: ${base.added}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ") || null,
      baseLink: base.link!.trim(),
      imageUrl: base.image!.trim(),
      createdBy: "Community Base Library",
      expiresAt: null,
      isActive: false,
    })),
  });

  console.log(
    `[BASE-POOL] ${selected.length} recente TH${townHall}-bases geïmporteerd.`,
  );

  return {
    imported: selected.length,
    catalogCandidates: recentCandidates.length,
    maxAgeDays: MAX_BASE_AGE_DAYS,
  };
}

export async function chooseChallengeBase(
  townHall: number,
  excludedBaseId?: number,
) {
  const now = new Date();

  /*
   * Alleen bases die:
   * - uit onze automatische pool komen
   * - maximaal 7 dagen oud zijn
   * - niet al actief zijn
   * mogen voor een Challenge gebruikt worden.
   */
  const available = await prisma.base.findMany({
    where: {
      townHall,
      createdBy: "Community Base Library",
      isActive: false,
      createdAt: {
        gte: new Date(
          now.getTime() -
            MAX_BASE_AGE_DAYS *
              24 *
              60 *
              60 *
              1000,
        ),
      },
      ...(excludedBaseId
        ? {
            id: {
              not: excludedBaseId,
            },
          }
        : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!available.length) {
    return null;
  }

  return available[
    Math.floor(
      Math.random() * available.length,
    )
  ];
}

export async function activateBaseForChallenge(
  baseId: number | null,
  expiresAt: Date,
) {
  await prisma.$transaction(async (tx) => {
    await tx.base.updateMany({
      where: {
        townHall: 18,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    if (baseId === null) {
      return;
    }

    await tx.base.update({
      where: {
        id: baseId,
      },
      data: {
        isActive: true,
        expiresAt,
      },
    });
  });
}
