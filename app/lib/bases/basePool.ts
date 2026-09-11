import { prisma } from "@/app/lib/prisma";

const CLASHFOX_URL = "https://clashfox.com/daily-bases/th18";
const BASEMELON_URL = "https://basemelon.com/coc-bases-th18/war";

const CLASHFOX_LIMIT = 25;
const BASEMELON_LIMIT = 10;
const TOTAL_POOL_LIMIT = 35;
const MAX_BASE_AGE_HOURS = 48;

const AUTOMATIC_PROVIDERS = [
  "ClashFox",
  "BaseMelon",
  "Community Base Library",
  "Cocbases",
];

type ScrapedBase = {
  name: string;
  imageUrl: string;
  baseLink: string;
  sourceUrl: string;
  sourceProvider: "ClashFox" | "BaseMelon";
  sourcePublishedAt: Date;
};

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "Mozilla/5.0 (compatible; TDG-Phoenix/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} voor ${url}`);
  }

  return response.text();
}

function parseDate(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function extractSourceDate(html: string): Date | null {
  const jsonLdMatches = [
    ...html.matchAll(
      /"(?:datePublished|dateModified|uploadDate|publishedAt|updatedAt)"\s*:\s*"([^"]+)"/gi,
    ),
  ];

  for (const match of jsonLdMatches) {
    const date = parseDate(match[1]);

    if (date) {
      return date;
    }
  }

  const metaMatches = [
    ...html.matchAll(
      /<meta[^>]+(?:property|name)=["'](?:article:published_time|article:modified_time|datePublished|dateModified)["'][^>]+content=["']([^"']+)["']/gi,
    ),
  ];

  for (const match of metaMatches) {
    const date = parseDate(match[1]);

    if (date) {
      return date;
    }
  }

  return null;
}

function isFresh(date: Date, now: Date): boolean {
  const age = now.getTime() - date.getTime();

  return (
    age >= 0 &&
    age <= MAX_BASE_AGE_HOURS * 60 * 60 * 1000
  );
}

function extractFirstImage(html: string): string | null {
  const ogImage =
    html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    )?.[1] ??
    html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    )?.[1];

  if (ogImage) {
    return decodeHtml(ogImage);
  }

  const image =
    html.match(
      /<img[^>]+src=["']([^"']+)["']/i,
    )?.[1];

  return image ? decodeHtml(image) : null;
}

function extractName(html: string): string | null {
  const h1 = html.match(
    /<h1[^>]*>([\s\S]*?)<\/h1>/i,
  )?.[1];

  return h1 ? decodeHtml(stripHtml(h1)) : null;
}

function extractCopyLink(html: string): string | null {
  const matches = [
    ...html.matchAll(
      /<a[^>]+href=["']([^"']*link\.clashofclans\.com[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi,
    ),
  ];

  for (const match of matches) {
    const text = stripHtml(match[2]);

    if (/copy base|layout link|copy/i.test(text)) {
      return decodeHtml(match[1]);
    }
  }

  const direct =
    html.match(
      /https?:\/\/link\.clashofclans\.com\/[^\s"'<>]+/i,
    )?.[0];

  return direct ? decodeHtml(direct) : null;
}

async function scrapeDetail(
  sourceUrl: string,
  provider: "ClashFox" | "BaseMelon",
): Promise<ScrapedBase | null> {
  const html = await fetchHtml(sourceUrl);

  const name = extractName(html);
  const imageUrl = extractFirstImage(html);
  const baseLink = extractCopyLink(html);
  const sourcePublishedAt = extractSourceDate(html);

  if (
    !name ||
    !imageUrl ||
    !baseLink ||
    !sourcePublishedAt
  ) {
    console.warn(
      `[BASE-POOL] ${provider}: layout overgeslagen; ontbrekende broninformatie: ${sourceUrl}`,
    );

    return null;
  }

  if (!isFresh(sourcePublishedAt, new Date())) {
    console.log(
      `[BASE-POOL] ${provider}: layout ouder dan ${MAX_BASE_AGE_HOURS} uur: ${sourceUrl}`,
    );

    return null;
  }

  return {
    name,
    imageUrl,
    baseLink,
    sourceUrl,
    sourceProvider: provider,
    sourcePublishedAt,
  };
}

function extractClashFoxLinks(html: string): string[] {
  const links = new Set<string>();

  const regex =
    /https?:\/\/clashfox\.com\/base\/th18\/[a-z0-9-]+/gi;

  for (const match of html.matchAll(regex)) {
    links.add(match[0]);
  }

  return [...links];
}

function extractBaseMelonLinks(html: string): string[] {
  const links = new Set<string>();

  const regex =
    /<a[^>]+href=["']([^"']*\/coc-bases-th18\/war[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(regex)) {
    const href = decodeHtml(match[1]);
    const text = stripHtml(match[2]);

    if (!/NEW/i.test(text)) {
      continue;
    }

    const absolute = new URL(
      href,
      "https://basemelon.com",
    ).toString();

    if (
      absolute.includes("/coc-bases-th18/war") &&
      !absolute.includes("/page-")
    ) {
      links.add(absolute);
    }
  }

  return [...links];
}

async function collectProvider(
  provider: "ClashFox" | "BaseMelon",
  listingUrl: string,
  limit: number,
): Promise<ScrapedBase[]> {
  try {
    const listingHtml = await fetchHtml(listingUrl);

    const links =
      provider === "ClashFox"
        ? extractClashFoxLinks(listingHtml)
        : extractBaseMelonLinks(listingHtml);

    console.log(
      `[BASE-POOL] ${provider}: ${links.length} kandidaatlinks gevonden.`,
    );

    const result: ScrapedBase[] = [];

    for (const sourceUrl of links) {
      if (result.length >= limit) {
        break;
      }

      try {
        const base = await scrapeDetail(
          sourceUrl,
          provider,
        );

        if (!base) {
          continue;
        }

        if (
          result.some(
            (item) => item.baseLink === base.baseLink,
          )
        ) {
          continue;
        }

        result.push(base);
      } catch (error) {
        console.warn(
          `[BASE-POOL] ${provider}: detailpagina kon niet worden gelezen: ${sourceUrl}`,
          error,
        );
      }
    }

    return result;
  } catch (error) {
    console.error(
      `[BASE-POOL] ${provider}: listing kon niet worden gelezen.`,
      error,
    );

    return [];
  }
}

export async function refreshBasePool(townHall = 18) {
  if (townHall !== 18) {
    throw new Error(
      "De automatische Base Pool ondersteunt momenteel alleen TH18.",
    );
  }

  const now = new Date();

  const oldestAllowed = new Date(
    now.getTime() -
      MAX_BASE_AGE_HOURS * 60 * 60 * 1000,
  );

  /*
   * Alleen automatisch geïmporteerde bases worden opgeschoond.
   * TDG-eigen bases vallen buiten deze providers.
   *
   * Een base die nog aan een actieve challenge hangt,
   * blijft behouden totdat die challenge voorbij is.
   */
  await prisma.base.updateMany({
    where: {
      townHall,
      createdBy: {
        in: AUTOMATIC_PROVIDERS,
      },
      createdAt: {
        lt: oldestAllowed,
      },
      randomChallenges: {
        none: {
          endsAt: {
            gt: now,
          },
        },
      },
    },
    data: {
      isActive: false,
    },
  });

  /*
   * Volledige automatische pool:
   * oude automatische bases worden niet verwijderd uit de DB,
   * maar alleen buiten de actieve selectie gehouden.
   */
  const existing = await prisma.base.findMany({
    where: {
      townHall,
      createdBy: {
        in: AUTOMATIC_PROVIDERS,
      },
    },
    select: {
      baseLink: true,
    },
  });

  const existingLinks = new Set(
    existing.map((base) => base.baseLink),
  );

  const clashFoxBases = await collectProvider(
    "ClashFox",
    CLASHFOX_URL,
    CLASHFOX_LIMIT,
  );

  const baseMelonBases = await collectProvider(
    "BaseMelon",
    BASEMELON_URL,
    BASEMELON_LIMIT,
  );

  const combined = [
    ...clashFoxBases,
    ...baseMelonBases,
  ]
    .filter(
      (base) => !existingLinks.has(base.baseLink),
    )
    .filter(
      (base, index, all) =>
        all.findIndex(
          (item) => item.baseLink === base.baseLink,
        ) === index,
    )
    .slice(0, TOTAL_POOL_LIMIT);

  if (!combined.length) {
    console.warn(
      "[BASE-POOL] Geen nieuwe bases voldeden aan de harde 48-uurscontrole.",
    );

    return {
      imported: 0,
      clashFox: 0,
      baseMelon: 0,
      total: 0,
      maxAgeHours: MAX_BASE_AGE_HOURS,
    };
  }

  await prisma.base.createMany({
    data: combined.map((base) => ({
      townHall,
      category: "Challenge",
      name: base.name,
      description:
        `TDG Challenge Base · ${base.sourceProvider}`,
      baseLink: base.baseLink,
      imageUrl: base.imageUrl,
      createdBy: base.sourceProvider,
      sourceProvider: base.sourceProvider,
      sourceUrl: base.sourceUrl,
      sourcePublishedAt: base.sourcePublishedAt,
      expiresAt: null,
      isActive: false,
    })),
  });

  const clashFoxCount = combined.filter(
    (base) => base.sourceProvider === "ClashFox",
  ).length;

  const baseMelonCount = combined.filter(
    (base) => base.sourceProvider === "BaseMelon",
  ).length;

  console.log(
    `[BASE-POOL] Refresh klaar: ${combined.length} totaal (${clashFoxCount} ClashFox, ${baseMelonCount} BaseMelon).`,
  );

  return {
    imported: combined.length,
    clashFox: clashFoxCount,
    baseMelon: baseMelonCount,
    total: combined.length,
    maxAgeHours: MAX_BASE_AGE_HOURS,
  };
}

export async function chooseChallengeBase(
  townHall: number,
  excludedBaseId?: number,
) {
  const now = new Date();

  const oldestAllowed = new Date(
    now.getTime() -
      MAX_BASE_AGE_HOURS * 60 * 60 * 1000,
  );

  let available = await prisma.base.findMany({
    where: {
      townHall,
      createdBy: {
        in: ["ClashFox", "BaseMelon"],
      },
      sourcePublishedAt: {
        gte: oldestAllowed,
        lte: now,
      },
      isActive: false,
      ...(excludedBaseId
        ? {
            id: {
              not: excludedBaseId,
            },
          }
        : {}),
      randomChallenges: {
        none: {
          endsAt: {
            gt: now,
          },
        },
      },
    },
    orderBy: {
      sourcePublishedAt: "desc",
    },
    take: TOTAL_POOL_LIMIT,
  });

  if (!available.length) {
    try {
      await refreshBasePool(townHall);
    } catch (error) {
      console.error(
        "[BASE-POOL] Automatisch refreshen mislukt:",
        error,
      );
    }

    available = await prisma.base.findMany({
      where: {
        townHall,
        createdBy: {
          in: ["ClashFox", "BaseMelon"],
        },
        sourcePublishedAt: {
          gte: oldestAllowed,
          lte: now,
        },
        isActive: false,
        ...(excludedBaseId
          ? {
              id: {
                not: excludedBaseId,
              },
            }
          : {}),
        randomChallenges: {
          none: {
            endsAt: {
              gt: now,
            },
          },
        },
      },
      orderBy: {
        sourcePublishedAt: "desc",
      },
      take: TOTAL_POOL_LIMIT,
    });
  }

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
  if (!baseId) {
    return;
  }

  await prisma.base.update({
    where: {
      id: baseId,
    },
    data: {
      expiresAt,
    },
  });
}
