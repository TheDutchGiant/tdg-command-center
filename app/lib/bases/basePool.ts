import { prisma } from "@/app/lib/prisma";

const TOTAL_POOL_LIMIT = 35;
const MAX_BASE_AGE_HOURS = 48;
const MAX_CANDIDATES_PER_SOURCE = 100;

type SourceProvider =
  | "RedditCoCBaseLink"
  | "RedditCOCBaseLayouts"
  | "ClashLayouts"
  | "ClashBaseLink"
  | "BaseMelon"
  | "AllClash";

type ScrapedBase = {
  name: string;
  imageUrl: string;
  baseLink: string;
  sourceUrl: string;
  sourceProvider: SourceProvider;
  sourcePublishedAt: Date;
};

type SourceConfig = {
  provider: SourceProvider;
  urls: string[];
};

const SOURCES: SourceConfig[] = [
  {
    provider: "RedditCoCBaseLink",
    urls: [
      "https://www.reddit.com/r/cocbaselink/new/.rss?limit=50",
      "https://old.reddit.com/r/cocbaselink/new/.rss?limit=50",
    ],
  },
  {
    provider: "RedditCOCBaseLayouts",
    urls: [
      "https://www.reddit.com/r/COCBaseLayouts/new/.rss?limit=50",
      "https://old.reddit.com/r/COCBaseLayouts/new/.rss?limit=50",
    ],
  },
  {
    provider: "ClashLayouts",
    urls: [
      "https://coclayouts.harshitrv.in/",
    ],
  },
  {
    provider: "ClashBaseLink",
    urls: [
      "https://clashbaselink.com/th18-base-layout/",
    ],
  },
  {
    provider: "BaseMelon",
    urls: [
      "https://basemelon.com/coc-bases-th18/war",
      "https://basemelon.com/coc-bases-th18/trophy-defense",
      "https://basemelon.com/coc-bases-th18/legend",
    ],
  },
  {
    provider: "AllClash",
    urls: [
      "https://www.allclash.com/the-best-th18-war-trophy-farming-base-layouts/",
    ],
  },
];

const BLOCKED_TERMS =
  /\b(?:farm|farming|progress|progression|resource|loot)\b/i;

const ALLOWED_TERMS =
  /\b(?:war|cwl|trophy|trophy\s+defen[cs]e|legend|ranked|defen[cs]e|anti\s+(?:1|2|3)\s*star|anti\s+(?:everything|air|dragon|hydra|smash|thrower|electro\s*dragon))\b/i;

const CLASH_LINK_RE =
  /https?:\/\/link\.clashofclans\.com\/[^\s"'<>\\)\]]+/gi;

function cleanClashLink(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/\\\//g, "/")
    .replace(/[)\],.;]+$/g, "")
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

function decodeXml(value: string): string {
  return decodeHtml(value)
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "");
}

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;

  const parsed = new Date(value.trim());

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function isFresh(date: Date, now = new Date()): boolean {
  const age = now.getTime() - date.getTime();

  return (
    age >= 0 &&
    age <= MAX_BASE_AGE_HOURS * 60 * 60 * 1000
  );
}

function looksLikeTh18(text: string): boolean {
  return /\b(?:th\s*18|th18|town\s*hall\s*18|townhall\s*18)\b/i.test(
    text,
  );
}

function isAllowedBaseText(text: string): boolean {
  if (BLOCKED_TERMS.test(text)) {
    return false;
  }

  return ALLOWED_TERMS.test(text);
}

function extractClashLinks(text: string): string[] {
  const found = new Set<string>();

  for (const match of text.matchAll(CLASH_LINK_RE)) {
    if (match[0]) {
      found.add(cleanClashLink(match[0]));
    }
  }

  return [...found];
}

function extractFirstImage(html: string): string | null {
  const og =
    html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    )?.[1] ??
    html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    )?.[1];

  if (og) {
    return decodeHtml(og);
  }

  return (
    html.match(
      /<img[^>]+(?:src|data-src)=["']([^"']+)["']/i,
    )?.[1] ?? null
  );
}

function extractTitle(html: string): string {
  const h1 = html.match(
    /<h1[^>]*>([\s\S]*?)<\/h1>/i,
  )?.[1];

  if (h1) {
    return decodeHtml(stripHtml(h1));
  }

  const title = html.match(
    /<title[^>]*>([\s\S]*?)<\/title>/i,
  )?.[1];

  return title ? decodeHtml(stripHtml(title)) : "";
}

function extractExactSourceDate(html: string): Date | null {
  const candidates: string[] = [];

  const metaPatterns = [
    /<meta[^>]+(?:property|name)=["']article:published_time["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+(?:property|name)=["']datePublished["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+(?:property|name)=["']published_time["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+(?:property|name)=["']date["'][^>]+content=["']([^"']+)["']/gi,
  ];

  for (const pattern of metaPatterns) {
    for (const match of html.matchAll(pattern)) {
      if (match[1]) {
        candidates.push(match[1]);
      }
    }
  }

  const jsonLdPatterns = [
    /"datePublished"\s*:\s*"([^"]+)"/gi,
    /"dateCreated"\s*:\s*"([^"]+)"/gi,
    /"uploadDate"\s*:\s*"([^"]+)"/gi,
    /"publishedAt"\s*:\s*"([^"]+)"/gi,
  ];

  for (const pattern of jsonLdPatterns) {
    for (const match of html.matchAll(pattern)) {
      if (match[1]) {
        candidates.push(match[1]);
      }
    }
  }

  const visibleText = stripHtml(html);

  const visiblePatterns = [
    /\bAdded\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/gi,
    /\bPublished\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/gi,
    /\bUpdated\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/gi,
    /\bLast Updated\s*:?\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})/gi,
  ];

  for (const pattern of visiblePatterns) {
    for (const match of visibleText.matchAll(pattern)) {
      if (match[1]) {
        candidates.push(match[1]);
      }
    }
  }

  const dates = candidates
    .map(parseDate)
    .filter((date): date is Date => date !== null)
    .sort((a, b) => b.getTime() - a.getTime());

  return dates[0] ?? null;
}

async function fetchText(
  url: string,
  accept = "text/html,application/xhtml+xml,*/*;q=0.8",
): Promise<string> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: accept,
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/151 Safari/537.36 TDG-Phoenix/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} voor ${url}`);
  }

  return response.text();
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
      const url = new URL(
        decodeHtml(match[1]),
        baseUrl,
      ).toString();

      links.add(url);
    } catch {
      // Ongeldige link negeren.
    }
  }

  return [...links];
}

function isLikelyBaseDetail(
  url: string,
  provider: SourceProvider,
): boolean {
  switch (provider) {
    case "ClashLayouts":
      return /\/(?:th18|town-hall-18|townhall-18)[^/]*\/[^/]+/i.test(
        url,
      );

    case "ClashBaseLink":
      return /clashbaselink\.com\/th18-[^/]+-base/i.test(
        url,
      );

    case "BaseMelon":
      return /basemelon\.com\/coc-bases-th18\/[^/]+-id\d+/i.test(
        url,
      );

    case "AllClash":
      return /allclash\.com/i.test(url);

    default:
      return false;
  }
}

async function scrapeHtmlDetail(
  url: string,
  provider: SourceProvider,
): Promise<ScrapedBase | null> {
  const html = await fetchText(url);
  const visibleText = stripHtml(html);
  const title = extractTitle(html);

  const combinedText = `${url} ${title} ${visibleText}`;

  if (!looksLikeTh18(combinedText)) {
    console.log(
      `[BASE-POOL] ${provider}: geen TH18: ${url}`,
    );
    return null;
  }

  if (!isAllowedBaseText(combinedText)) {
    console.log(
      `[BASE-POOL] ${provider}: geen toegestane categorie: ${url}`,
    );
    return null;
  }

  const baseLink =
    extractClashLinks(html)[0] ??
    null;

  if (!baseLink) {
    console.log(
      `[BASE-POOL] ${provider}: geen Clash-link: ${url}`,
    );
    return null;
  }

  const sourcePublishedAt =
    extractExactSourceDate(html);

  if (!sourcePublishedAt) {
    console.log(
      `[BASE-POOL] ${provider}: geen exacte publicatiedatum: ${url}`,
    );
    return null;
  }

  if (!isFresh(sourcePublishedAt)) {
    console.log(
      `[BASE-POOL] ${provider}: ouder dan 48 uur: ${url}`,
    );
    return null;
  }

  const imageUrl =
    extractFirstImage(html);

  if (!imageUrl) {
    console.log(
      `[BASE-POOL] ${provider}: geen afbeelding: ${url}`,
    );
    return null;
  }

  return {
    name:
      title.slice(0, 180) ||
      `TH18 Base via ${provider}`,
    imageUrl,
    baseLink,
    sourceUrl: url,
    sourceProvider: provider,
    sourcePublishedAt,
  };
}

function rssField(
  entry: string,
  field: string,
): string {
  const match = entry.match(
    new RegExp(
      `<${field}(?:\\s[^>]*)?>([\\s\\S]*?)</${field}>`,
      "i",
    ),
  );

  return match?.[1]
    ? decodeXml(match[1]).trim()
    : "";
}

function extractRssClashLinks(
  entry: string,
): string[] {
  const found = new Set<string>();

  for (const match of entry.matchAll(CLASH_LINK_RE)) {
    if (match[0]) {
      found.add(cleanClashLink(match[0]));
    }
  }

  for (const match of entry.matchAll(
    /<link[^>]+href=["']([^"']+)["'][^>]*>/gi,
  )) {
    if (
      match[1] &&
      /link\.clashofclans\.com/i.test(match[1])
    ) {
      found.add(cleanClashLink(match[1]));
    }
  }

  return [...found];
}

function extractRssImage(entry: string): string | null {
  const candidates = [
    /<media:(?:content|thumbnail)[^>]+url=["']([^"']+)["']/i,
    /<img[^>]+src=["']([^"']+)["']/i,
    /https?:\/\/[^\s<>"')\]]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s<>"')\]]*)?/i,
  ];

  for (const pattern of candidates) {
    const match = entry.match(pattern);

    if (match?.[1] ?? match?.[0]) {
      return decodeXml(match[1] ?? match[0]);
    }
  }

  return null;
}

async function collectReddit(
  config: SourceConfig,
): Promise<ScrapedBase[]> {
  const result: ScrapedBase[] = [];
  const seenLinks = new Set<string>();

  const now = new Date();
  const oldestAllowed = new Date(
    now.getTime() -
      MAX_BASE_AGE_HOURS *
        60 *
        60 *
        1000,
  );

  function extractDateNear(
    text: string,
  ): Date | null {
    const candidates: string[] = [];

    const patterns = [
      /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?\b/gi,
      /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s+\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}(?:\s+\d{2}:\d{2}(?::\d{2})?\s*(?:GMT|UTC)?)?/gi,
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/gi,
      /\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi,
    ];

    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        if (match[0]) {
          candidates.push(match[0]);
        }
      }
    }

    const dates = candidates
      .map((value) => {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime())
          ? null
          : parsed;
      })
      .filter(
        (date): date is Date =>
          date !== null,
      );

    dates.sort(
      (a, b) =>
        Math.abs(
          now.getTime() - a.getTime(),
        ) -
        Math.abs(
          now.getTime() - b.getTime(),
        ),
    );

    return dates[0] ?? null;
  }

  function extractTitleNear(
    text: string,
  ): string {
    const headings = [
      ...text.matchAll(
        /(?:^|\n)\s*#{1,6}\s+(.+?)(?=\n|$)/g,
      ),
    ];

    if (headings.length) {
      return headings[0][1]
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 180);
    }

    const lines = text
      .split(/\r?\n/)
      .map((line) =>
        line
          .replace(/[*_`>]+/g, "")
          .replace(/\s+/g, " ")
          .trim(),
      )
      .filter(Boolean);

    return (
      lines.find((line) =>
        /th\s*18|th18|town\s*hall\s*18/i.test(
          line,
        ),
      )?.slice(0, 180) ??
      "TH18 Base via Reddit"
    );
  }

  function extractImageNear(
    text: string,
  ): string | null {
    const markdownImage =
      text.match(
        /!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/i,
      )?.[1];

    if (markdownImage) {
      return markdownImage;
    }

    return (
      text.match(
        /https?:\/\/[^\s<>"')\]]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s<>"')\]]*)?/i,
      )?.[0] ?? null
    );
  }

  async function fetchViaJina(
    feedUrl: string,
  ): Promise<string> {
    const jinaUrl =
      `https://r.jina.ai/${feedUrl}`;

    return fetchText(
      jinaUrl,
      "text/plain,text/markdown,application/json,*/*;q=0.8",
    );
  }

  for (const feedUrl of config.urls) {
    let raw = "";

    /*
     * Eerst Jina gebruiken.
     * Reddit RSS kan vanaf VPS-IP's 403/429 geven.
     */
    try {
      raw = await fetchViaJina(feedUrl);
      console.log(
        `[BASE-POOL] ${config.provider}: Reddit via Jina opgehaald.`,
      );
    } catch (jinaError) {
      console.warn(
        `[BASE-POOL] ${config.provider}: Jina mislukt, directe RSS fallback.`,
        jinaError,
      );

      try {
        raw = await fetchText(
          feedUrl,
          "application/atom+xml,application/rss+xml,application/xml,text/xml,*/*;q=0.8",
        );

        console.log(
          `[BASE-POOL] ${config.provider}: directe Reddit RSS opgehaald.`,
        );
      } catch (directError) {
        console.warn(
          `[BASE-POOL] ${config.provider}: directe Reddit RSS eveneens mislukt.`,
          directError,
        );
        continue;
      }
    }

    const clashLinks = [
      ...raw.matchAll(
        /https?:\/\/link\.clashofclans\.com\/[^\s<>"')\]]+/gi,
      ),
    ]
      .map((match) =>
        cleanClashLink(match[0]),
      )
      .filter(Boolean);

    const uniqueClashLinks = [
      ...new Set(clashLinks),
    ];

    console.log(
      `[BASE-POOL] ${config.provider}: ${uniqueClashLinks.length} Clash-links gevonden.`,
    );

    for (const baseLink of uniqueClashLinks) {
      if (
        result.length >=
        MAX_CANDIDATES_PER_SOURCE
      ) {
        return result;
      }

      if (seenLinks.has(baseLink)) {
        continue;
      }

      seenLinks.add(baseLink);

      const linkIndex =
        raw.indexOf(baseLink);

      const contextStart =
        Math.max(0, linkIndex - 1800);

      const contextEnd =
        Math.min(
          raw.length,
          linkIndex + 1200,
        );

      const context =
        raw.slice(
          contextStart,
          contextEnd,
        );

      if (!looksLikeTh18(context)) {
        continue;
      }

      if (!isAllowedBaseText(context)) {
        continue;
      }

      const sourcePublishedAt =
        extractDateNear(context);

      if (!sourcePublishedAt) {
        console.log(
          `[BASE-POOL] ${config.provider}: Clash-link zonder aantoonbare datum: ${baseLink}`,
        );
        continue;
      }

      if (
        sourcePublishedAt <
          oldestAllowed ||
        sourcePublishedAt > now
      ) {
        continue;
      }

      const title =
        extractTitleNear(context);

      const imageUrl =
        extractImageNear(context) ??
        "https://www.redditstatic.com/desktop2x/img/favicon/favicon-32x32.png";

      result.push({
        name: title,
        imageUrl,
        baseLink,
        sourceUrl: feedUrl,
        sourceProvider: config.provider,
        sourcePublishedAt,
      });
    }
  }

  return result;
}

async function collectHtmlProvider(
  config: SourceConfig,
): Promise<ScrapedBase[]> {
  const candidates = new Set<string>();

  for (const listingUrl of config.urls) {
    try {
      const html =
        await fetchText(listingUrl);

      const links =
        extractHrefLinks(
          html,
          listingUrl,
        );

      for (const link of links) {
        if (
          isLikelyBaseDetail(
            link,
            config.provider,
          )
        ) {
          candidates.add(link);
        }
      }

      for (const clashLink of extractClashLinks(html)) {
        console.log(
          `[BASE-POOL] ${config.provider}: losse Clash-link gevonden op listing ${clashLink}`,
        );
      }
    } catch (error) {
      console.warn(
        `[BASE-POOL] ${config.provider}: listing mislukt ${listingUrl}`,
        error,
      );
    }
  }

  console.log(
    `[BASE-POOL] ${config.provider}: ${candidates.size} detailpagina kandidaten`,
  );

  const result: ScrapedBase[] = [];

  for (const candidate of candidates) {
    if (
      result.length >=
      MAX_CANDIDATES_PER_SOURCE
    ) {
      break;
    }

    try {
      const base =
        await scrapeHtmlDetail(
          candidate,
          config.provider,
        );

      if (base) {
        result.push(base);
      }
    } catch (error) {
      console.warn(
        `[BASE-POOL] ${config.provider}: detail mislukt ${candidate}`,
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
      "RedditCoCBaseLink" ||
    config.provider ===
      "RedditCOCBaseLayouts"
  ) {
    return collectReddit(config);
  }

  return collectHtmlProvider(config);
}

export async function refreshBasePool(
  townHall = 18,
) {
  if (townHall !== 18) {
    throw new Error(
      "De automatische Base Pool ondersteunt momenteel alleen TH18.",
    );
  }

  const now = new Date();

  const oldestAllowed =
    new Date(
      now.getTime() -
        MAX_BASE_AGE_HOURS *
          60 *
          60 *
          1000,
    );

  /*
   * Alleen automatische bases mogen hier worden opgeschoond.
   * TDG-eigen bases hebben sourceProvider = null.
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
        (base) => base.baseLink,
      ),
    );

  const collected: ScrapedBase[] = [];
  const sourceResults: {
    provider: SourceProvider;
    candidates: number;
    accepted: number;
  }[] = [];

  /*
   * Bronnen sequentieel uitvoeren.
   * Dat voorkomt onnodige 429's bij Reddit en andere sites.
   */
  for (const source of SOURCES) {
    try {
      const bases =
        await collectProvider(source);

      collected.push(...bases);

      sourceResults.push({
        provider: source.provider,
        candidates: bases.length,
        accepted: bases.length,
      });

      console.log(
        `[BASE-POOL] ${source.provider}: ${bases.length} verse kandidaten.`,
      );
    } catch (error) {
      console.error(
        `[BASE-POOL] ${source.provider}: collector volledig mislukt`,
        error,
      );

      sourceResults.push({
        provider: source.provider,
        candidates: 0,
        accepted: 0,
      });
    }
  }

  /*
   * Centrale veiligheidsfilter.
   */
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
      "[BASE-POOL] Geen verse base voldoet aan alle veiligheidsregels.",
    );

    return {
      imported: 0,
      total: 0,
      target: TOTAL_POOL_LIMIT,
      maxAgeHours:
        MAX_BASE_AGE_HOURS,
      sources: sourceResults,
    };
  }

  await prisma.base.createMany({
    data: combined.map(
      (base) => ({
        townHall,
        category: "Challenge",
        name: base.name,
        description:
          `TDG Challenge Base · ${base.sourceProvider}`,
        baseLink: base.baseLink,
        imageUrl: base.imageUrl,
        createdBy: base.sourceProvider,
        sourceProvider:
          base.sourceProvider,
        sourceUrl:
          base.sourceUrl,
        sourcePublishedAt:
          base.sourcePublishedAt,
        expiresAt: null,
        isActive: false,
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
    const amount =
      combined.filter(
        (base) =>
          base.sourceProvider ===
          source.provider,
      ).length;

    console.log(
      `[BASE-POOL] ${source.provider}: ${amount}`,
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
    sources: SOURCES.map(
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
  const now = new Date();

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
          sourcePublishedAt:
            "desc",
        },
        take: TOTAL_POOL_LIMIT,
      });

  let available =
    await findAvailable();

  if (!available.length) {
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

  if (!available.length) {
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
 * Oude helper behouden zodat bestaande imports
 * niet breken. Challenge-base wordt niet meer
 * via isActive gekoppeld aan Base of the Week.
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
