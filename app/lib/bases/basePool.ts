import { prisma } from "@/app/lib/prisma";

const BASE_CATALOG_URL =
  "https://raw.githubusercontent.com/nschmeller/clash-bases/main/bases.json";

const DEFAULT_IMPORT_COUNT = 10;

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
};

type RemoteCatalog = {
  bases?: RemoteBase[];
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
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
  const existing = await prisma.base.findMany({
    where: {
      townHall,
    },
    select: {
      baseLink: true,
    },
  });

  const existingLinks = new Set(
    existing.map((base) => base.baseLink),
  );

  const catalog = await fetchCatalog();

  const candidates = catalog.filter((base) => {
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

    const type = String(
      base.type ?? "",
    ).toLowerCase();

    return (
      type === "war" ||
      type === "hybrid" ||
      type === "trophy"
    );
  });

  const selected = shuffle(
    candidates,
  ).slice(0, count);

  if (!selected.length) {
    return {
      imported: 0,
      catalogCandidates: candidates.length,
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
    `[BASE-POOL] ${selected.length} nieuwe TH${townHall}-bases geïmporteerd.`,
  );

  return {
    imported: selected.length,
    catalogCandidates: candidates.length,
  };
}

export async function chooseChallengeBase(
  townHall: number,
) {
  const available = await prisma.base.findMany({
    where: {
      townHall,
      isActive: false,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });

  if (available.length) {
    return available[
      Math.floor(
        Math.random() * available.length,
      )
    ];
  }

  return prisma.base.findFirst({
    where: {
      townHall,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
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
