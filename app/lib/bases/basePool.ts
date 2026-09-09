import { prisma } from "@/app/lib/prisma";

const BASEMELON_WAR_URL =
  "https://basemelon.com/coc-bases-th18/war";

const DEFAULT_IMPORT_COUNT = 10;
const MAX_BASE_AGE_DAYS = 7;

type ScrapedBase = {
  name: string;
  imageUrl: string;
  baseLink: string;
  sourceUrl: string;
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

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent":
        "Mozilla/5.0 (compatible; TDG-Phoenix/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(
      `BaseMelon gaf HTTP ${response.status} terug voor ${url}.`,
    );
  }

  return response.text();
}

function extractNewBaseLinks(html: string): string[] {
  const links = new Set<string>();

  /*
   * BaseMelon zet de nieuwste layouts op de eerste
   * Latest-pagina en markeert verse layouts met NEW.
   *
   * We zoeken alleen echte TH18 War-layout links.
   */
  const regex =
    /<a[^>]+href=["']([^"']*\/coc-bases-th18\/war(?:-[^"'<> ]+)?(?:-id\d+)?|[^"']*\/coc-bases-th18\/war-id\d+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    const href = decodeHtml(match[1]);
    const content = match[2]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!/NEW/i.test(content)) {
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

  const baseImage =
    html.match(
      /<img[^>]+src=["']([^"']*img\.basemelon\.com[^"']+)["']/i,
    )?.[1];

  return baseImage
    ? decodeHtml(baseImage)
    : null;
}

function extractName(html: string): string | null {
  const title =
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];

  if (!title) {
    return null;
  }

  return decodeHtml(
    title
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function extractCopyLink(html: string): string | null {
  const matches = [
    ...html.matchAll(
      /<a[^>]+href=["']([^"']*link\.clashofclans\.com[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi,
    ),
  ];

  for (const match of matches) {
    const text = match[2]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (/copy base|layout link/i.test(text)) {
      return decodeHtml(match[1]);
    }
  }

  return null;
}

async function scrapeBase(
  sourceUrl: string,
): Promise<ScrapedBase | null> {
  const html = await fetchHtml(sourceUrl);

  const name = extractName(html);
  const imageUrl = extractFirstImage(html);
  const baseLink = extractCopyLink(html);

  if (!name || !imageUrl || !baseLink) {
    console.warn(
      `[BASE-POOL] Kon layout niet volledig uitlezen: ${sourceUrl}`,
    );

    return null;
  }

  return {
    name,
    imageUrl,
    baseLink,
    sourceUrl,
  };
}

export async function refreshBasePool(
  townHall = 18,
  count = DEFAULT_IMPORT_COUNT,
) {
  if (townHall !== 18) {
    throw new Error(
      "De BaseMelon importer is momenteel ingericht voor TH18.",
    );
  }

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
   * Automatisch geïmporteerde bases ouder dan 7 dagen
   * worden uit de actieve Challenge-pool gehaald.
   */
  await prisma.base.updateMany({
    where: {
      townHall,
      createdBy: {
        in: [
          "BaseMelon",
          "Community Base Library",
          "Cocbases",
        ],
      },
      createdAt: {
        lt: oldestAllowed,
      },
    },
    data: {
      isActive: false,
    },
  });

  const existing = await prisma.base.findMany({
    where: {
      townHall,
      createdBy: {
        in: [
          "BaseMelon",
          "Community Base Library",
          "Cocbases",
        ],
      },
    },
    select: {
      baseLink: true,
    },
  });

  const existingLinks = new Set(
    existing.map((base) => base.baseLink),
  );

  const listingHtml = await fetchHtml(
    BASEMELON_WAR_URL,
  );

  const candidateLinks =
    extractNewBaseLinks(listingHtml);

  if (!candidateLinks.length) {
    console.warn(
      "[BASE-POOL] BaseMelon gaf momenteel geen NEW-layoutlinks terug.",
    );

    return {
      imported: 0,
      candidates: 0,
      maxAgeDays: MAX_BASE_AGE_DAYS,
    };
  }

  const scraped: ScrapedBase[] = [];

  for (const sourceUrl of candidateLinks) {
    if (scraped.length >= count) {
      break;
    }

    try {
      const base = await scrapeBase(sourceUrl);

      if (!base) {
        continue;
      }

      if (existingLinks.has(base.baseLink)) {
        continue;
      }

      if (
        scraped.some(
          (item) => item.baseLink === base.baseLink,
        )
      ) {
        continue;
      }

      scraped.push(base);
    } catch (error) {
      console.warn(
        `[BASE-POOL] Layout kon niet worden gelezen: ${sourceUrl}`,
        error,
      );
    }
  }

  const selected = shuffle(scraped);

  if (!selected.length) {
    console.warn(
      "[BASE-POOL] Geen nieuwe BaseMelon-layouts geïmporteerd.",
    );

    return {
      imported: 0,
      candidates: candidateLinks.length,
      maxAgeDays: MAX_BASE_AGE_DAYS,
    };
  }

  await prisma.base.createMany({
    data: selected.map((base) => ({
      townHall,
      category: "Challenge",
      name: base.name,
      description:
        `TDG Challenge Base · BaseMelon · ${base.sourceUrl}`,
      baseLink: base.baseLink,
      imageUrl: base.imageUrl,
      createdBy: "BaseMelon",
      expiresAt: null,
      isActive: false,
    })),
  });

  console.log(
    `[BASE-POOL] ${selected.length} nieuwe BaseMelon TH${townHall}-bases geïmporteerd.`,
  );

  return {
    imported: selected.length,
    candidates: candidateLinks.length,
    maxAgeDays: MAX_BASE_AGE_DAYS,
  };
}

export async function chooseChallengeBase(
  townHall: number,
  excludedBaseId?: number,
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

  let available = await prisma.base.findMany({
    where: {
      townHall,
      createdBy: {
        in: [
          "BaseMelon",
          "Community Base Library",
          "Cocbases",
        ],
      },
      createdAt: {
        gte: oldestAllowed,
      },
      isActive: false,
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
    take: 100,
  });

  /*
   * Geen verse pool? Dan vullen we hem automatisch bij.
   * Daardoor hoeft de Challenge-start geen aparte
   * handmatige importer meer te hebben.
   */
  if (!available.length) {
    try {
      await refreshBasePool(
        townHall,
        DEFAULT_IMPORT_COUNT,
      );
    } catch (error) {
      console.error(
        "[BASE-POOL] Automatisch bijvullen mislukt:",
        error,
      );
    }

    available = await prisma.base.findMany({
      where: {
        townHall,
        createdBy: {
          in: [
            "BaseMelon",
            "Community Base Library",
            "Cocbases",
          ],
        },
        createdAt: {
          gte: oldestAllowed,
        },
        isActive: false,
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
      take: 100,
    });
  }

  if (!available.length) {
    return null;
  }

  /*
   * De nieuwste bases hebben de voorkeur, maar we
   * houden random variatie binnen de verse pool.
   */
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
  /*
   * Bewaard voor compatibiliteit met bestaande code.
   *
   * De Challenge Base hoort NIET dezelfde status te krijgen
   * als de algemene Base van de Week.
   */
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
