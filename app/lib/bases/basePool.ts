import { prisma } from "@/app/lib/prisma";

const TOTAL_POOL_LIMIT = 35;
const MAX_BASE_AGE_HOURS = 60 * 24;
const MAX_CANDIDATES_PER_SOURCE = 200;

type SourceProvider =
  | "CocBaseNet"
  | "ClashLoot"
  | "BaseForCoC";

type SourceConfig = {
  provider: SourceProvider;
  listingUrls: string[];
};

type ScrapedBase = {
  name: string;
  imageUrl: string;
  baseLink: string;
  sourceUrl: string;
  sourceProvider: SourceProvider;
  sourcePublishedAt: Date;
};

const SOURCES: SourceConfig[] = [
  {
    provider: "ClashLoot",
    listingUrls: [
      "https://clashloot.com/coc/bases/th-18/cwl_war/crafted-defenses",
      "https://clashloot.com/coc/bases/th-18/ranked",
      "https://clashloot.com/coc/bases/th-18/crafted-defenses",
    ],
  },
  {
    provider: "CocBaseNet",
    listingUrls: [
      "https://cocbase.net/town-hall-18-war-layouts",
      "https://cocbase.net/town-hall-18-war-layouts/page-2",
      "https://cocbase.net/town-hall-18-war-layouts/page-3",
      "https://cocbase.net/town-hall-18-war-layouts/page-4",
      "https://cocbase.net/town-hall-18-layouts",
      "https://cocbase.net/town-hall-18-layouts/page-2",
      "https://cocbase.net/town-hall-18-layouts/page-3",
      "https://cocbase.net/town-hall-trophy-layouts",
      "https://cocbase.net/town-hall-trophy-layouts/page-2",
    ],
  },
  {
    provider: "BaseForCoC",
    listingUrls: [
      "https://baseforcoc.com/th18",
      "https://baseforcoc.com/events/clashiversary-bases/th18",
    ],
  },
];

const CURRENT_CRAFTED_DEFENSE_RE =
  /\b(?:hero\s*hunter|hot\s*candle|cake\s*[- ]?\s*a\s*[- ]?\s*pult)\b/i;

const BLOCKED_CATEGORY_RE =
  /\b(?:farm|farming|progress|progression|resource|resources|loot)\b/i;

const ALLOWED_CATEGORY_RE =
  /\b(?:war|cwl|ranked|trophy|defense|defence|legend|anti\s*(?:1|2|3)\s*star|anti\s*(?:everything|air|ground|dragon|hydra|thrower|root\s*rider|electro\s*dragon))\b/i;

const CLASH_LINK_RE =
  /https?:\/\/link\.clashofclans\.com\/[^\s<>"')\]]+/gi;

function clean(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\\\//g, "/")
    .replace(/[),.;]+$/g, "")
    .trim();
}

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;

  const date = new Date(
    value.trim(),
  );

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function isFresh(
  date: Date,
  now = new Date(),
): boolean {
  const age =
    now.getTime() -
    date.getTime();

  return (
    age >= 0 &&
    age <=
      MAX_BASE_AGE_HOURS *
        60 *
        60 *
        1000
  );
}

function looksLikeTh18(
  text: string,
): boolean {
  return /\b(?:TH\s*18|TH18|Town\s*Hall\s*18|TownHall\s*18)\b/i.test(
    text,
  );
}

function extractClashLinks(
  html: string,
): string[] {
  const links = new Set<string>();

  for (const match of html.matchAll(
    CLASH_LINK_RE,
  )) {
    if (match[0]) {
      links.add(
        clean(match[0]),
      );
    }
  }

  return [...links];
}

function extractHrefLinks(
  html: string,
  baseUrl: string,
): string[] {
  const links = new Set<string>();

  for (const match of html.matchAll(
    /<a[^>]+href=["']([^"']+)["'][^>]*>/gi,
  )) {
    try {
      const value = clean(
        match[1],
      );

      if (
        !value ||
        /^javascript:/i.test(value) ||
        value.startsWith("#")
      ) {
        continue;
      }

      links.add(
        new URL(
          value,
          baseUrl,
        ).toString(),
      );
    } catch {
      // Ongeldige links negeren.
    }
  }

  return [...links];
}

function extractTitle(
  html: string,
): string {
  const h1 =
    html.match(
      /<h1[^>]*>([\s\S]*?)<\/h1>/i,
    )?.[1];

  if (h1) {
    const value =
      decodeHtml(
        stripHtml(h1),
      );

    if (value) {
      return value;
    }
  }

  const title =
    html.match(
      /<title[^>]*>([\s\S]*?)<\/title>/i,
    )?.[1];

  return title
    ? decodeHtml(
        stripHtml(title),
      )
    : "TH18 Base";
}

function extractImage(
  html: string,
): string | null {
  const ogImage =
    html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    )?.[1] ??
    html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    )?.[1];

  if (ogImage) {
    return clean(
      ogImage,
    );
  }

  const image =
    html.match(
      /<img[^>]+(?:src|data-src)=["']([^"']+)["']/i,
    )?.[1];

  if (image) {
    return clean(
      image,
    );
  }

  const assetsImage =
    html.match(
      /https?:\/\/[^\s"'<>]+(?:jpg|jpeg|png|webp)(?:\?[^\s"'<>]*)?/i,
    )?.[0];

  return assetsImage
    ? clean(
        assetsImage,
      )
    : null;
}

function extractStructuredDate(
  html: string,
): Date | null {
  const values: string[] = [];

  const patterns = [
    /"datePublished"\s*:\s*"([^"]+)"/gi,
    /"dateCreated"\s*:\s*"([^"]+)"/gi,
    /"dateModified"\s*:\s*"([^"]+)"/gi,
    /"publishedAt"\s*:\s*"([^"]+)"/gi,
    /"createdAt"\s*:\s*"([^"]+)"/gi,
    /"updatedAt"\s*:\s*"([^"]+)"/gi,
    /<time[^>]+datetime=["']([^"']+)["']/gi,
    /<meta[^>]+(?:property|name)=["'][^"']*(?:published|modified|updated|date)[^"']*["'][^>]+content=["']([^"']+)["']/gi,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(
      pattern,
    )) {
      if (match[1]) {
        values.push(
          match[1],
        );
      }
    }
  }

  const dates =
    values
      .map(parseDate)
      .filter(
        (date): date is Date =>
          date !== null,
      );

  dates.sort(
    (a, b) =>
      b.getTime() -
      a.getTime(),
  );

  return dates[0] ?? null;
}

function isClashLootDetailUrl(
  url: string,
): boolean {
  return /^https?:\/\/clashloot\.com\/coc\/bases\/th18-[^/?#]+(?:[?#].*)?$/i.test(
    url,
  );
}

function isCocBaseDetailUrl(
  url: string,
): boolean {
  return /^https?:\/\/cocbase\.net\/th18-[^/?#]+(?:[?#].*)?$/i.test(
    url,
  );
}

function isBaseForCoCDetailUrl(
  url: string,
): boolean {
  return /^https?:\/\/baseforcoc\.com\/bases\/th18-[^/?#]+(?:[?#].*)?$/i.test(
    url,
  );
}

function isDetailUrl(
  url: string,
  provider: SourceProvider,
): boolean {
  switch (provider) {
    case "ClashLoot":
      return isClashLootDetailUrl(
        url,
      );

    case "CocBaseNet":
      return isCocBaseDetailUrl(
        url,
      );

    case "BaseForCoC":
      return isBaseForCoCDetailUrl(
        url,
      );
  }
}

async function fetchText(
  url: string,
): Promise<string> {
  const response =
    await fetch(url, {
      cache: "no-store",
      headers: {
        Accept:
          "text/html,application/xhtml+xml,text/plain,*/*;q=0.8",
        "Accept-Language":
          "en-US,en;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/151 Safari/537.36 TDG-Phoenix-BasePool/1.0",
      },
    });

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} voor ${url}`,
    );
  }

  return response.text();
}

async function scrapeDetail(
  url: string,
  provider: SourceProvider,
): Promise<ScrapedBase | null> {
  const html =
    await fetchText(url);

  const title =
    extractTitle(html);

  const plain =
    stripHtml(html);

  const titleAndUrl =
    `${url}\n${title}`;

  const allText =
    `${titleAndUrl}\n${plain}`;

  if (!looksLikeTh18(allText)) {
    return null;
  }

  /*
   * Categorie alleen bepalen op concrete
   * detailgegevens, niet op site-navigatie.
   */
  if (
    BLOCKED_CATEGORY_RE.test(
      titleAndUrl,
    )
  ) {
    return null;
  }

  if (
    !ALLOWED_CATEGORY_RE.test(
      titleAndUrl,
    )
  ) {
    return null;
  }

  /*
   * Alleen de huidige Crafted Defense-rotatie.
   *
   * ClashLoot /crafted-defenses en BaseForCoC's
   * Clashiversary-pagina's zijn al specifiek hierop
   * gericht. Voor gewone detailpagina's moet de titel
   * zelf de huidige Crafted Defense noemen.
   */
  const currentCraftInTitle =
    CURRENT_CRAFTED_DEFENSE_RE.test(
      titleAndUrl,
    );

  const currentCraftPage =
    provider === "ClashLoot" &&
    /\/crafted-defenses(?:[/?#]|$)/i.test(
      url,
    );

  const currentEventPage =
    provider === "BaseForCoC" &&
    /clashiversary\s+crafted\s+defenses/i.test(
      plain.slice(0, 1800),
    );

  if (
    !currentCraftInTitle &&
    !currentCraftPage &&
    !currentEventPage
  ) {
    return null;
  }

  const clashLinks =
    extractClashLinks(html);

  if (!clashLinks.length) {
    console.log(
      `[BASE-POOL] ${provider}: geen Clash-link ${url}`,
    );
    return null;
  }

  const imageUrl =
    extractImage(html);

  /*
   * Geen placeholder meer.
   * Zonder echte afbeelding komt de base niet in
   * de automatische pool.
   */
  if (!imageUrl) {
    console.log(
      `[BASE-POOL] ${provider}: geen afbeelding ${url}`,
    );
    return null;
  }

  let sourcePublishedAt =
    extractStructuredDate(
      html,
    );

  /*
   * De gespecialiseerde actuele catalogi hebben geen
   * consequente detaildatum. Voor een kandidaat die
   * expliciet aan de actuele Crafted Defense-rotatie
   * gekoppeld is, gebruiken we het moment waarop Phoenix
   * hem ontdekt.
   *
   * Bij een volgende refresh wordt de pool volledig
   * vervangen, waardoor oude niet-meer-gepubliceerde
   * kandidaten vanzelf verdwijnen.
   */
  if (
    !sourcePublishedAt
  ) {
    sourcePublishedAt =
      new Date();
  }

  if (
    !isFresh(
      sourcePublishedAt,
    )
  ) {
    return null;
  }

  return {
    name:
      title.slice(
        0,
        180,
      ),
    imageUrl,
    baseLink:
      clashLinks[0],
    sourceUrl: url,
    sourceProvider:
      provider,
    sourcePublishedAt,
  };
}

async function collectProvider(
  config: SourceConfig,
): Promise<ScrapedBase[]> {
  const result: ScrapedBase[] = [];
  const detailUrls =
    new Set<string>();
  const seenLinks =
    new Set<string>();

  for (
    const listingUrl of
    config.listingUrls
  ) {
    try {
      const listing =
        await fetchText(
          listingUrl,
        );

      for (
        const link of
        extractHrefLinks(
          listing,
          listingUrl,
        )
      ) {
        if (
          isDetailUrl(
            link,
            config.provider,
          )
        ) {
          detailUrls.add(
            link,
          );
        }
      }

      console.log(
        `[BASE-POOL] ${config.provider}: ${detailUrls.size} detailpagina-kandidaten na ${listingUrl}`,
      );
    } catch (error) {
      console.warn(
        `[BASE-POOL] ${config.provider}: listing mislukt ${listingUrl}`,
        error,
      );
    }
  }

  for (
    const detailUrl of
    detailUrls
  ) {
    if (
      result.length >=
      MAX_CANDIDATES_PER_SOURCE
    ) {
      break;
    }

    try {
      const base =
        await scrapeDetail(
          detailUrl,
          config.provider,
        );

      if (
        base &&
        !seenLinks.has(
          base.baseLink,
        )
      ) {
        seenLinks.add(
          base.baseLink,
        );

        result.push(
          base,
        );
      }
    } catch (error) {
      console.warn(
        `[BASE-POOL] ${config.provider}: detail mislukt ${detailUrl}`,
        error,
      );
    }
  }

  console.log(
    `[BASE-POOL] ${config.provider}: ${result.length} geldige kandidaten.`,
  );

  return result;
}

async function getProtectedChallengeBaseIds(
  townHall: number,
  now: Date,
): Promise<number[]> {
  const activeChallenges =
    await prisma.randomChallenge.findMany({
      where: {
        townHall,
        endsAt: {
          gt: now,
        },
        baseId: {
          not: null,
        },
      },
      select: {
        baseId: true,
      },
    });

  return activeChallenges
    .map(
      (challenge) =>
        challenge.baseId,
    )
    .filter(
      (id): id is number =>
        id !== null,
    );
}

export async function refreshBasePool(
  townHall = 18,
) {
  if (
    townHall !== 18
  ) {
    throw new Error(
      "De automatische Base Pool ondersteunt momenteel alleen TH18.",
    );
  }

  const now =
    new Date();

  const collected:
    ScrapedBase[] = [];

  const sourceResults: {
    provider: SourceProvider;
    candidates: number;
    accepted: number;
  }[] = [];

  /*
   * Eerst verzamelen.
   * Pas wanneer we minstens één geldige kandidaat
   * hebben, vervangen we de bestaande automatische pool.
   */
  for (
    const source of SOURCES
  ) {
    try {
      const bases =
        await collectProvider(
          source,
        );

      collected.push(
        ...bases,
      );

      sourceResults.push({
        provider:
          source.provider,
        candidates:
          bases.length,
        accepted:
          bases.length,
      });
    } catch (error) {
      console.error(
        `[BASE-POOL] ${source.provider}: collector mislukt`,
        error,
      );

      sourceResults.push({
        provider:
          source.provider,
        candidates: 0,
        accepted: 0,
      });
    }
  }

  /*
   * Eén globale deduplicatie op Clash-link.
   */
  const unique =
    collected
      .filter(
        (base, index, all) =>
          all.findIndex(
            (other) =>
              other.baseLink ===
              base.baseLink,
          ) === index,
      )
      .sort(
        (a, b) =>
          b.sourcePublishedAt.getTime() -
          a.sourcePublishedAt.getTime(),
      )
      .slice(
        0,
        TOTAL_POOL_LIMIT,
      );

  if (!unique.length) {
    console.warn(
      "[BASE-POOL] Geen geldige actuele bases gevonden. Bestaande automatische pool blijft behouden.",
    );

    return {
      imported: 0,
      total: 0,
      target:
        TOTAL_POOL_LIMIT,
      maxAgeHours:
        MAX_BASE_AGE_HOURS,
      sources:
        sourceResults,
    };
  }

  const protectedIds =
    await getProtectedChallengeBaseIds(
      townHall,
      now,
    );

  /*
   * Automatische pool volledig vervangen.
   *
   * TDG-eigen bases hebben sourceProvider = null
   * en worden dus niet geraakt.
   *
   * Actieve Challenge-bases worden beschermd.
   */
  await prisma.base.deleteMany({
    where: {
      townHall,
      sourceProvider: {
        not: null,
      },
      id: {
        notIn:
          protectedIds,
      },
    },
  });

  /*
   * Beschermde Challenge-bases blijven bestaan maar tellen
   * niet mee als nieuwe automatische pool.
   */
  await prisma.base.createMany({
    data:
      unique.map(
        (base) => ({
          townHall,
          category:
            "Challenge",
          name:
            base.name,
          description:
            `TDG Challenge Base · ${base.sourceProvider}`,
          baseLink:
            base.baseLink,
          imageUrl:
            base.imageUrl,
          createdBy:
            base.sourceProvider,
          sourceProvider:
            base.sourceProvider,
          sourceUrl:
            base.sourceUrl,
          sourcePublishedAt:
            base.sourcePublishedAt,
          expiresAt:
            null,
          isActive:
            false,
        }),
      ),
  });

  console.log(
    `[BASE-POOL] ========================================`,
  );

  console.log(
    `[BASE-POOL] Nieuwe automatische pool: ${unique.length}/${TOTAL_POOL_LIMIT}`,
  );

  for (
    const source of SOURCES
  ) {
    const count =
      unique.filter(
        (base) =>
          base.sourceProvider ===
          source.provider,
      ).length;

    console.log(
      `[BASE-POOL] ${source.provider}: ${count}`,
    );
  }

  console.log(
    `[BASE-POOL] ========================================`,
  );

  return {
    imported:
      unique.length,
    total:
      unique.length,
    target:
      TOTAL_POOL_LIMIT,
    maxAgeHours:
      MAX_BASE_AGE_HOURS,
    sources:
      SOURCES.map(
        (source) => ({
          provider:
            source.provider,
          candidates:
            sourceResults.find(
              (item) =>
                item.provider ===
                source.provider,
            )?.candidates ?? 0,
          imported:
            unique.filter(
              (base) =>
                base.sourceProvider ===
                source.provider,
            ).length,
        }),
      ),
  };
}

export async function chooseChallengeBase(
  townHall: number,
  excludedBaseId?: number,
) {
  const now =
    new Date();

  const oldestAllowed =
    new Date(
      now.getTime() -
        MAX_BASE_AGE_HOURS *
          60 *
          60 *
          1000,
    );

  const protectedIds =
    await getProtectedChallengeBaseIds(
      townHall,
      now,
    );

  const candidates =
    await prisma.base.findMany({
      where: {
        townHall,
        sourceProvider: {
          not: null,
        },
        sourcePublishedAt: {
          gte:
            oldestAllowed,
          lte:
            now,
        },
        isActive:
          false,
        imageUrl: {
          not: "",
        },
        id: {
          notIn: [
            ...protectedIds,
            ...(excludedBaseId
              ? [excludedBaseId]
              : []),
          ],
        },
        randomChallenges: {
          none: {
            endsAt: {
              gt: now,
            },
          },
        },
      },
      orderBy: {
        sourcePublishedAt:
          "desc",
      },
      take:
        TOTAL_POOL_LIMIT,
    });

  if (!candidates.length) {
    try {
      await refreshBasePool(
        townHall,
      );
    } catch (error) {
      console.error(
        "[BASE-POOL] Automatische refresh mislukt:",
        error,
      );
    }

    const refreshed =
      await prisma.base.findMany({
        where: {
          townHall,
          sourceProvider: {
            not: null,
          },
          sourcePublishedAt: {
            gte:
              oldestAllowed,
            lte:
              new Date(),
          },
          isActive:
            false,
          imageUrl: {
            not: "",
          },
          ...(excludedBaseId
            ? {
                id: {
                  not:
                    excludedBaseId,
                },
              }
            : {}),
          randomChallenges: {
            none: {
              endsAt: {
                gt: new Date(),
              },
            },
          },
        },
        orderBy: {
          sourcePublishedAt:
            "desc",
        },
        take:
          TOTAL_POOL_LIMIT,
      });

    if (!refreshed.length) {
      return null;
    }

    return refreshed[
      Math.floor(
        Math.random() *
          refreshed.length,
      )
    ];
  }

  return candidates[
    Math.floor(
      Math.random() *
        candidates.length,
    )
  ];
}

/*
 * Bestaande helper behouden voor compatibiliteit.
 * Dit activeert de base niet als Base of the Week.
 */
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
