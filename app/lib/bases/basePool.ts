import { prisma } from "@/app/lib/prisma";

const TOTAL_POOL_LIMIT = 35;
const MAX_BASE_AGE_HOURS = 48;
const MAX_CANDIDATES_PER_SOURCE = 100;

type SourceProvider =
  | "CocMap"
  | "CocBaseNet"
  | "CoClanLayouts";

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
    provider: "CocMap",
    listingUrls: [
      "https://cocmap.com/clash-of-clans/layouts/town-hall-18-war-base",
      "https://cocmap.com/clash-of-clans/layouts/town-hall-18-trophy-base",
      "https://cocmap.com/clash-of-clans/layouts/town-hall-18-cwl-base",
      "https://cocmap.com/clash-of-clans/layouts/town-hall-18-defense-base",
      "https://cocmap.com/clash-of-clans/layouts/town-hall-18-legend-base",
    ],
  },
  {
    provider: "CocBaseNet",
    listingUrls: [
      "https://cocbase.net/town-hall-18-war-layouts",
      "https://cocbase.net/town-hall-18-layouts",
    ],
  },
  {
    provider: "CoClanLayouts",
    listingUrls: [
      "https://coclanlayouts.com/th18-bases",
    ],
  },
];

const BLOCKED_TERMS =
  /\b(?:farm|farming|progress|progression|resource|resources|loot)\b/i;

const ALLOWED_TERMS =
  /\b(?:war|cwl|trophy|trophy\s+defen[cs]e|legend|ranked|defen[cs]e|anti\s*(?:1|2|3)\s*star|anti\s*(?:everything|air|dragon|hydra|blimp|root\s*rider|lava(?:loon)?|electro\s*dragon|e[-\s]?drag))\b/i;

const CLASH_LINK_RE =
  /https?:\/\/link\.clashofclans\.com\/[^\s<>"')\]]+/gi;

const COCMAP_DETAIL_RE =
  /https?:\/\/cocmap\.com\/[^\s<>"')\]]+/gi;

const COCBASE_DETAIL_RE =
  /https?:\/\/cocbase\.net\/[^\s<>"')\]]+/gi;

const COCLAN_DETAIL_RE =
  /https?:\/\/coclanlayouts\.com\/[^\s<>"')\]]+/gi;

function cleanUrl(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/\\\//g, "/")
    .replace(/[),.;]+$/g, "")
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

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDate(value: string): Date | null {
  const parsed = new Date(value.trim());

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
}

function isFresh(
  date: Date,
  now = new Date(),
): boolean {
  const age = now.getTime() - date.getTime();

  return (
    age >= 0 &&
    age <=
      MAX_BASE_AGE_HOURS *
        60 *
        60 *
        1000
  );
}

function looksLikeTh18(text: string): boolean {
  return /\b(?:TH\s*18|TH18|Town\s*Hall\s*18|TownHall\s*18)\b/i.test(
    text,
  );
}

function isAllowedCategory(text: string): boolean {
  if (BLOCKED_TERMS.test(text)) {
    return false;
  }

  return ALLOWED_TERMS.test(text);
}

function extractClashLinks(
  text: string,
): string[] {
  const result = new Set<string>();

  for (const match of text.matchAll(
    CLASH_LINK_RE,
  )) {
    if (match[0]) {
      result.add(
        cleanUrl(match[0]),
      );
    }
  }

  return [...result];
}

function extractMarkdownLinks(
  text: string,
): string[] {
  const result = new Set<string>();

  for (const match of text.matchAll(
    /\[[^\]]+\]\((https?:\/\/[^)\s]+)\)/gi,
  )) {
    if (match[1]) {
      result.add(
        cleanUrl(match[1]),
      );
    }
  }

  return [...result];
}

function extractFirstImage(
  text: string,
): string | null {
  const markdown =
    text.match(
      /!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/i,
    )?.[1];

  if (markdown) {
    return cleanUrl(markdown);
  }

  return (
    text.match(
      /https?:\/\/[^\s<>"')\]]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s<>"')\]]*)?/i,
    )?.[0] ?? null
  );
}

function extractTitle(
  text: string,
): string {
  const heading =
    text.match(
      /(?:^|\n)\s*#{1,6}\s+(.+?)(?:\n|$)/,
    )?.[1];

  if (heading) {
    return heading
      .replace(/\s+/g, " ")
      .trim();
  }

  const htmlTitle =
    text.match(
      /<title[^>]*>([\s\S]*?)<\/title>/i,
    )?.[1];

  if (htmlTitle) {
    return stripHtml(
      decodeHtml(htmlTitle),
    );
  }

  return "TH18 Base";
}

function extractCocMapDate(
  text: string,
): Date | null {
  const patterns = [
    /2026-[A-Z][a-z]{2}-\d{2}:\d{2}-\d{2}-\d{2}/g,
    /2026-[A-Z][a-z]{2}-\d{2}[:\s]\d{2}[-:]\d{2}[-:]\d{2}/g,
  ];

  const dates: Date[] = [];

  for (const pattern of patterns) {
    for (const match of text.matchAll(
      pattern,
    )) {
      const value = match[0];

      const parsed =
        value.match(
          /^(\d{4})-([A-Za-z]{3})-(\d{2}):(\d{2})-(\d{2})-(\d{2})$/,
        );

      if (!parsed) {
        continue;
      }

      const months: Record<
        string,
        number
      > = {
        Jan: 0,
        Feb: 1,
        Mar: 2,
        Apr: 3,
        May: 4,
        Jun: 5,
        Jul: 6,
        Aug: 7,
        Sep: 8,
        Oct: 9,
        Nov: 10,
        Dec: 11,
      };

      const month =
        months[parsed[2]];

      if (month === undefined) {
        continue;
      }

      const date = new Date(
        Number(parsed[1]),
        month,
        Number(parsed[3]),
        Number(parsed[4]),
        Number(parsed[5]),
        Number(parsed[6]),
      );

      if (!Number.isNaN(date.getTime())) {
        dates.push(date);
      }
    }
  }

  dates.sort(
    (a, b) =>
      b.getTime() - a.getTime(),
  );

  return dates[0] ?? null;
}

function extractStructuredDate(
  text: string,
): Date | null {
  const candidates: string[] = [];

  const patterns = [
    /"datePublished"\s*:\s*"([^"]+)"/gi,
    /"dateCreated"\s*:\s*"([^"]+)"/gi,
    /"dateModified"\s*:\s*"([^"]+)"/gi,
    /"publishedAt"\s*:\s*"([^"]+)"/gi,
    /"createdAt"\s*:\s*"([^"]+)"/gi,
    /"updatedAt"\s*:\s*"([^"]+)"/gi,
    /<meta[^>]+(?:property|name)=["'][^"']*(?:published|date|modified)[^"']*["'][^>]+content=["']([^"']+)["']/gi,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(
      pattern,
    )) {
      if (match[1]) {
        candidates.push(match[1]);
      }
    }
  }

  const dates = candidates
    .map(parseDate)
    .filter(
      (date): date is Date =>
        date !== null,
    )
    .filter((date) =>
      isFresh(date),
    );

  dates.sort(
    (a, b) =>
      b.getTime() - a.getTime(),
  );

  return dates[0] ?? null;
}

function extractCocMapDetailUrls(
  text: string,
): string[] {
  const links = new Set<string>();

  for (const match of text.matchAll(
    COCMAP_DETAIL_RE,
  )) {
    const url = cleanUrl(match[0]);

    if (
      /cocmap\.com\/.*\/layouts\//i.test(
        url,
      ) &&
      /\/[a-f0-9]{20,}$/i.test(
        url,
      )
    ) {
      links.add(url);
    }
  }

  for (const link of extractMarkdownLinks(text)) {
    if (
      /cocmap\.com\/.*\/layouts\//i.test(
        link,
      ) &&
      /\/[a-f0-9]{20,}(?:\?|$)/i.test(
        link,
      )
    ) {
      links.add(link);
    }
  }

  return [...links];
}

function extractCocBaseDetailUrls(
  text: string,
): string[] {
  const links = new Set<string>();

  for (const match of text.matchAll(
    COCBASE_DETAIL_RE,
  )) {
    const url = cleanUrl(match[0]);

    if (
      /cocbase\.net\/th18-/i.test(
        url,
      )
    ) {
      links.add(url);
    }
  }

  for (const link of extractMarkdownLinks(text)) {
    if (
      /cocbase\.net\/th18-/i.test(
        link,
      )
    ) {
      links.add(link);
    }
  }

  return [...links];
}

function extractCoClanDetailUrls(
  text: string,
): string[] {
  const links = new Set<string>();

  for (const match of text.matchAll(
    COCLAN_DETAIL_RE,
  )) {
    const url = cleanUrl(match[0]);

    if (
      /coclanlayouts\.com\/th18-bases\//i.test(
        url,
      )
    ) {
      links.add(url);
    }
  }

  for (const link of extractMarkdownLinks(text)) {
    if (
      /coclanlayouts\.com\/th18-bases\//i.test(
        link,
      )
    ) {
      links.add(link);
    }
  }

  return [...links];
}

async function fetchText(
  url: string,
): Promise<string> {
  const directResponse =
    await fetch(url, {
      cache: "no-store",
      headers: {
        Accept:
          "text/html,application/xhtml+xml,text/plain,*/*;q=0.8",
        "Accept-Language":
          "en-US,en;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/151 Safari/537.36 TDG-Phoenix/1.0",
      },
    });

  if (directResponse.ok) {
    return directResponse.text();
  }

  /*
   * Sommige bronnen blokkeren het VPS-IP.
   * Jina gebruiken we uitsluitend als fetch-proxy.
   */
  const jinaUrl =
    `https://r.jina.ai/${url}`;

  const jinaResponse =
    await fetch(jinaUrl, {
      cache: "no-store",
      headers: {
        Accept:
          "text/plain,text/markdown,*/*;q=0.8",
        "User-Agent":
          "TDG-Phoenix-BaseAggregator/1.0",
      },
    });

  if (!jinaResponse.ok) {
    throw new Error(
      `Direct HTTP ${directResponse.status}; Jina HTTP ${jinaResponse.status} voor ${url}`,
    );
  }

  return jinaResponse.text();
}

async function scrapeDetail(
  url: string,
  provider: SourceProvider,
): Promise<ScrapedBase | null> {
  const text =
    await fetchText(url);

  const plain =
    stripHtml(text);

  const title =
    extractTitle(text);

  const combined =
    `${url}\n${title}\n${plain}`;

  /*
   * BELANGRIJK:
   * Gebruik voor de categorie NIET de volledige pagina.
   * Algemene navigatie van base-sites bevat woorden als
   * "Farming", "Progress" en "Loot", ook op een geldige
   * War/CWL/Defense-basepagina.
   *
   * TH18 mag wel overal op de concrete pagina worden gezocht.
   * De categorie wordt uitsluitend bepaald door URL + titel.
   */
  if (!looksLikeTh18(combined)) {
    console.log(
      `[BASE-POOL] ${provider}: geen TH18 ${url}`,
    );
    return null;
  }

  const categoryText =
    `${url}\n${title}`;

  if (BLOCKED_TERMS.test(categoryText)) {
    console.log(
      `[BASE-POOL] ${provider}: verboden categorie ${url}`,
    );
    return null;
  }

  if (!ALLOWED_TERMS.test(categoryText)) {
    console.log(
      `[BASE-POOL] ${provider}: geen toegestane categorie ${url}`,
    );
    return null;
  }

  const clashLinks =
    extractClashLinks(text);

  if (!clashLinks.length) {
    console.log(
      `[BASE-POOL] ${provider}: geen directe Clash-link ${url}`,
    );
    return null;
  }

  let sourcePublishedAt: Date | null =
    null;

  if (provider === "CocMap") {
    sourcePublishedAt =
      extractCocMapDate(
        combined,
      ) ??
      extractStructuredDate(
        text,
      );
  } else {
    sourcePublishedAt =
      extractStructuredDate(
        text,
      );
  }

  if (!sourcePublishedAt) {
    console.log(
      `[BASE-POOL] ${provider}: geen betrouwbare exacte datum ${url}`,
    );
    return null;
  }

  if (!isFresh(sourcePublishedAt)) {
    console.log(
      `[BASE-POOL] ${provider}: ouder dan 48 uur ${url}`,
    );
    return null;
  }

  const imageUrl =
    extractFirstImage(text);

  if (!imageUrl) {
    console.log(
      `[BASE-POOL] ${provider}: geen afbeelding ${url}`,
    );
    return null;
  }

  return {
    name:
      title.slice(0, 180),
    imageUrl,
    baseLink:
      clashLinks[0],
    sourceUrl: url,
    sourceProvider: provider,
    sourcePublishedAt,
  };
}

async function collectCocMap(
  config: SourceConfig,
): Promise<ScrapedBase[]> {
  const result: ScrapedBase[] = [];
  const seenDetails =
    new Set<string>();
  const seenLinks =
    new Set<string>();

  for (const listingUrl of config.listingUrls) {
    try {
      const listing =
        await fetchText(
          listingUrl,
        );

      const detailUrls =
        extractCocMapDetailUrls(
          listing,
        );

      console.log(
        `[BASE-POOL] CocMap: ${detailUrls.length} detailpagina's gevonden via ${listingUrl}`,
      );

      for (const detailUrl of detailUrls) {
        if (
          result.length >=
          MAX_CANDIDATES_PER_SOURCE
        ) {
          return result;
        }

        if (
          seenDetails.has(
            detailUrl,
          )
        ) {
          continue;
        }

        seenDetails.add(
          detailUrl,
        );

        try {
          const base =
            await scrapeDetail(
              detailUrl,
              "CocMap",
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

            result.push(base);
          }
        } catch (error) {
          console.warn(
            `[BASE-POOL] CocMap detail mislukt ${detailUrl}`,
            error,
          );
        }
      }
    } catch (error) {
      console.warn(
        `[BASE-POOL] CocMap listing mislukt ${listingUrl}`,
        error,
      );
    }
  }

  return result;
}

async function collectStandardProvider(
  config: SourceConfig,
): Promise<ScrapedBase[]> {
  const result: ScrapedBase[] = [];
  const seenDetails =
    new Set<string>();
  const seenLinks =
    new Set<string>();

  for (const listingUrl of config.listingUrls) {
    try {
      const listing =
        await fetchText(
          listingUrl,
        );

      let detailUrls: string[] = [];

      if (
        config.provider ===
        "CocBaseNet"
      ) {
        detailUrls =
          extractCocBaseDetailUrls(
            listing,
          );
      }

      if (
        config.provider ===
        "CoClanLayouts"
      ) {
        detailUrls =
          extractCoClanDetailUrls(
            listing,
          );
      }

      console.log(
        `[BASE-POOL] ${config.provider}: ${detailUrls.length} detailpagina's gevonden via ${listingUrl}`,
      );

      for (const detailUrl of detailUrls) {
        if (
          result.length >=
          MAX_CANDIDATES_PER_SOURCE
        ) {
          return result;
        }

        if (
          seenDetails.has(
            detailUrl,
          )
        ) {
          continue;
        }

        seenDetails.add(
          detailUrl,
        );

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

            result.push(base);
          }
        } catch (error) {
          console.warn(
            `[BASE-POOL] ${config.provider} detail mislukt ${detailUrl}`,
            error,
          );
        }
      }
    } catch (error) {
      console.warn(
        `[BASE-POOL] ${config.provider} listing mislukt ${listingUrl}`,
        error,
      );
    }
  }

  return result;
}

async function collectProvider(
  config: SourceConfig,
): Promise<ScrapedBase[]> {
  if (
    config.provider ===
    "CocMap"
  ) {
    return collectCocMap(
      config,
    );
  }

  return collectStandardProvider(
    config,
  );
}

export async function refreshBasePool(
  townHall = 18,
) {
  if (townHall !== 18) {
    throw new Error(
      "De automatische Base Pool ondersteunt momenteel alleen TH18.",
    );
  }

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

  /*
   * Alleen automatische bases
   * worden opgeschoond.
   * TDG-eigen bases hebben
   * sourceProvider = null.
   */
  await prisma.base.updateMany({
    where: {
      townHall,
      sourceProvider: {
        not: null,
      },
      sourcePublishedAt: {
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

  const existing =
    await prisma.base.findMany({
      where: {
        townHall,
        sourceProvider: {
          not: null,
        },
      },
      select: {
        baseLink: true,
      },
    });

  const existingLinks =
    new Set(
      existing.map(
        (base) =>
          base.baseLink,
      ),
    );

  const collected:
    ScrapedBase[] = [];

  const sourceResults: {
    provider: SourceProvider;
    candidates: number;
    accepted: number;
  }[] = [];

  for (const source of SOURCES) {
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

      console.log(
        `[BASE-POOL] ${source.provider}: ${bases.length} verse kandidaten.`,
      );
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

  const combined =
    collected
      .filter(
        (base) =>
          !existingLinks.has(
            base.baseLink,
          ),
      )
      .filter(
        (base, index, all) =>
          all.findIndex(
            (item) =>
              item.baseLink ===
              base.baseLink,
          ) === index,
      )
      .filter(
        (base) =>
          isFresh(
            base.sourcePublishedAt,
            now,
          ),
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

  if (!combined.length) {
    console.warn(
      "[BASE-POOL] Geen enkele verse veilige base gevonden.",
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

  await prisma.base.createMany({
    data: combined.map(
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
    `[BASE-POOL] ${combined.length}/${TOTAL_POOL_LIMIT} bases geïmporteerd.`,
  );

  for (const source of SOURCES) {
    const count =
      combined.filter(
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
      combined.length,
    total:
      combined.length,
    target:
      TOTAL_POOL_LIMIT,
    maxAgeHours:
      MAX_BASE_AGE_HOURS,
    sources:
      SOURCES.map(
        (source) => ({
          provider:
            source.provider,
          imported:
            combined.filter(
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

  const findAvailable =
    async () =>
      prisma.base.findMany({
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

  let available =
    await findAvailable();

  if (
    !available.length
  ) {
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

    available =
      await findAvailable();
  }

  if (
    !available.length
  ) {
    return null;
  }

  return available[
    Math.floor(
      Math.random() *
        available.length,
    )
  ];
}

/*
 * Behouden voor bestaande imports.
 * Deze helper activeert geen Base of the Week.
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
