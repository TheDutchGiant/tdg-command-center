import { prisma } from "@/app/lib/prisma";

const TOTAL_POOL_LIMIT = 35;
const MAX_BASE_AGE_HOURS = 48;
const MAX_CANDIDATES_PER_SOURCE = 100;

type SourceProvider =
  | "ClashFox"
  | "BaseMelon"
  | "ClanWarden"
  | "CocMap"
  | "ClashBaseLink"
  | "AllClash"
  | "BlueprintCoC"
  | "ClashCodes"
  | "RedditCoCBaseLink"
  | "RedditCOCBaseLayouts";

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
  listingUrls: string[];
};

const SOURCES: SourceConfig[] = [
  {
    provider: "ClashFox",
    listingUrls: [
      "https://clashfox.com/daily-bases/th18",
    ],
  },
  {
    provider: "BaseMelon",
    listingUrls: [
      "https://basemelon.com/coc-bases-th18",
      "https://basemelon.com/coc-bases-th18/war",
    ],
  },
  {
    provider: "ClanWarden",
    listingUrls: [
      "https://clanwarden.com/bases/th18",
    ],
  },
  {
    provider: "CocMap",
    listingUrls: [
      "https://cocmap.com/it/clash-of-clans/layouts/town-hall-18-war-base",
    ],
  },
  {
    provider: "ClashBaseLink",
    listingUrls: [
      "https://clashbaselink.com/th18-base-layout/",
    ],
  },
  {
    provider: "AllClash",
    listingUrls: [
      "https://www.allclash.com/the-best-th18-war-trophy-farming-base-layouts/",
    ],
  },
  {
    provider: "BlueprintCoC",
    listingUrls: [
      "https://blueprintcoc.com/blogs/coc-base-layouts/cwl-bases-legend-bases",
      "https://blueprintcoc.com/blogs/coc-base-layouts/best-cwl-base-every-th",
    ],
  },
  {
    provider: "ClashCodes",
    listingUrls: [
      "https://clashcodes.com/",
    ],
  },
  {
    provider: "RedditCoCBaseLink",
    listingUrls: [
      "https://www.reddit.com/r/cocbaselink/new/.rss?limit=100",
    ],
  },
  {
    provider: "RedditCOCBaseLayouts",
    listingUrls: [
      "https://www.reddit.com/r/COCBaseLayouts/new/.rss?limit=100",
    ],
  },
];

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

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept:
        "text/html,application/xhtml+xml,application/json",
      "User-Agent":
        "Mozilla/5.0 (compatible; TDG-Phoenix-BaseAggregator/1.0)",
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

  const trimmed = value.trim();

  /*
   * CocMap:
   * 2026-Sep-10:11-40-42
   */
  const cocMap = trimmed.match(
    /^(\d{4})-([A-Za-z]{3})-(\d{2}):(\d{2})-(\d{2})-(\d{2})$/,
  );

  if (cocMap) {
    const months: Record<string, number> = {
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

    const month = months[cocMap[2]];

    if (month !== undefined) {
      return new Date(
        Number(cocMap[1]),
        month,
        Number(cocMap[3]),
        Number(cocMap[4]),
        Number(cocMap[5]),
        Number(cocMap[6]),
      );
    }
  }

  const parsed = new Date(trimmed);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function extractDates(html: string): Date[] {
  const values: string[] = [];

  const patterns = [
    /"(?:datePublished|dateModified|uploadDate|publishedAt|updatedAt|createdAt|addedAt)"\s*:\s*"([^"]+)"/gi,
    /"(?:published|published_date|publishedDate|added|addedDate|created)"\s*:\s*"([^"]+)"/gi,
    /<meta[^>]+(?:property|name)=[\"'](?:article:published_time|article:modified_time|datePublished|dateModified|published_time|published)[\"'][^>]+content=[\"']([^\"']+)[\"']/gi,
    /\bAdded\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/gi,
    /\bLast Updated\s*:?\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})/gi,
    /\bUpdated\s*:?\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})/gi,
    /\b\d{4}-[A-Za-z]{3}-\d{2}:\d{2}-\d{2}-\d{2}\b/gi,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      values.push(match[1] ?? match[0]);
    }
  }

  return values
    .map(parseDate)
    .filter((date): date is Date => date !== null);
}

function extractSourceDate(
  html: string,
  provider: SourceProvider,
): Date | null {
  /*
   * Reddit krijgt zijn echte created_utc verderop uit JSON.
   */
  if (
    provider === "RedditCoCBaseLink" ||
    provider === "RedditCOCBaseLayouts"
  ) {
    return null;
  }

  const dates = extractDates(html);

  if (!dates.length) {
    return null;
  }

  dates.sort(
    (a, b) => b.getTime() - a.getTime(),
  );

  return dates[0];
}

function isFresh(
  date: Date,
  now: Date,
): boolean {
  const age = now.getTime() - date.getTime();

  return (
    age >= 0 &&
    age <= MAX_BASE_AGE_HOURS * 60 * 60 * 1000
  );
}

function extractFirstImage(
  html: string,
): string | null {
  const og =
    html.match(
      /<meta[^>]+property=[\"']og:image[\"'][^>]+content=[\"']([^\"']+)[\"']/i,
    )?.[1] ??
    html.match(
      /<meta[^>]+content=[\"']([^\"']+)[\"'][^>]+property=[\"']og:image[\"']/i,
    )?.[1];

  if (og) {
    return decodeHtml(og);
  }

  const image =
    html.match(
      /<img[^>]+(?:src|data-src)=[\"']([^\"']+)[\"']/i,
    )?.[1];

  return image ? decodeHtml(image) : null;
}

function extractName(
  html: string,
): string | null {
  const h1 = html.match(
    /<h1[^>]*>([\s\S]*?)<\/h1>/i,
  )?.[1];

  if (h1) {
    const value = decodeHtml(
      stripHtml(h1),
    );

    if (value) {
      return value;
    }
  }

  const title = html.match(
    /<title[^>]*>([\s\S]*?)<\/title>/i,
  )?.[1];

  if (title) {
    return decodeHtml(
      stripHtml(title),
    );
  }

  return null;
}

function extractCopyLink(
  html: string,
): string | null {
  const patterns = [
    /https?:\/\/link\.clashofclans\.com\/[^\s"'<>\\]+/gi,
    /https?:\\\/\\\/link\.clashofclans\.com\\\/[^\s"'<>\\]+/gi,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[0]) {
      return match[0]
        .replace(/\\\//g, "/")
        .replace(/[),.;]+$/, "");
    }
  }

  return null;
}

function isRejectedCategory(text: string): boolean {
  return /\b(?:farm|farming|progress|progression|resource|loot)\b/i.test(text);
}

function isAllowedCategory(text: string): boolean {
  const value = text
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return /\b(?:war|cwl|trophy|trophy\s+defen[cs]e|legend|ranked|defen[cs]e|anti\s+(?:1|2|3)\s+star|anti\s+(?:everything|air|dragon|hydra|smash|thrower|electro\s+dragon))\b/i.test(value);
}

function normalizeUrl(value: string, baseUrl: string): string | null {
  try {
    const decoded = decodeHtml(
      value
        .replace(/\\\//g, "/")
        .replace(/&amp;/g, "&")
        .trim(),
    );

    if (/^javascript:/i.test(decoded)) {
      return null;
    }

    return new URL(decoded, baseUrl).toString();
  } catch {
    return null;
  }
}

function extractHrefLinks(html: string, baseUrl: string): string[] {
  const result = new Set<string>();

  for (const match of html.matchAll(
    /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    const url = normalizeUrl(match[1], baseUrl);

    if (url) {
      result.add(url);
    }
  }

  return [...result];
}

function isBaseMelonDetailUrl(url: string): boolean {
  return /^https?:\/\/basemelon\.com\/coc-bases-th18\/[^/]+-id\d+(?:[/?#]|$)/i.test(url);
}

function isClanWardenDetailUrl(url: string): boolean {
  return /^https?:\/\/clanwarden\.com\/bases\/th18\/[^/]+(?:[/?#]|$)/i.test(url)
    && !/^https?:\/\/clanwarden\.com\/bases\/th18\/(?:war|cwl|trophy|legend|ranked|anti-[^/]+|defen[^/]*)(?:[/?#]|$)/i.test(url);
}

function isClashBaseLinkDetailUrl(url: string): boolean {
  return /^https?:\/\/clashbaselink\.com\/th18-[^/]+-base\/?(?:[?#]|$)/i.test(url);
}

function isClashFoxDetailUrl(url: string): boolean {
  return /^https?:\/\/clashfox\.com\/base\/th18\/[^/]+(?:[?#]|$)/i.test(url);
}

function isCocMapDetailUrl(url: string): boolean {
  return /^https?:\/\/cocmap\.com\/(?:it\/)?clash-of-clans\/layouts\/[^/]+(?:[?#]|$)/i.test(url);
}

function looksLikeTh18Base(text: string): boolean {
  return /(?:TH\s*18|TH18|Town\s*Hall\s*18|TownHall\s*18)/i.test(text);
}

function categoryIsAllowed(text: string): boolean {
  if (/\b(?:farm|farming|progress|progression|resource|loot)\b/i.test(text)) {
    return false;
  }

  return isAllowedCategory(text);
}

function extractCopyLinks(html: string): string[] {
  const links = new Set<string>();

  const patterns = [
    /https?:\/\/link\.clashofclans\.com\/[^\s"'<>\\]+/gi,
    /https?:\\\/\\\/link\.clashofclans\.com\\\/[^\s"'<>\\]+/gi,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const value = match[0]
        .replace(/\\\//g, "/")
        .replace(/[),.;]+$/, "");

      links.add(value);
    }
  }

  return [...links];
}

function sourceBasePattern(
  provider: SourceProvider,
): RegExp[] {
  switch (provider) {
    case "ClashFox":
      return [
        /https?:\/\/clashfox\.com\/base\/th18\/[a-z0-9-]+/gi,
      ];

    case "BaseMelon":
      return [
        /https?:\/\/basemelon\.com\/coc-bases-th18\/[^"'<>?\s]+-id\d+(?:\?[^"'<>]*)?/gi,
      ];

    case "ClanWarden":
      return [
        /https?:\/\/clanwarden\.com\/bases\/th18\/[a-z0-9-]+/gi,
      ];

    case "CocMap":
      return [
        /https?:\/\/cocmap\.com\/(?:it\/)?clash-of-clans\/layouts\/[a-z0-9-]+/gi,
      ];

    case "ClashBaseLink":
      return [
        /https?:\/\/clashbaselink\.com\/th18-[a-z0-9-]+-base\/?/gi,
      ];

    default:
      return [];
  }
}

async function collectBaseMelon(): Promise<ScrapedBase[]> {
  const result: ScrapedBase[] = [];
  const seen = new Set<string>();

  const categories = [
    "https://basemelon.com/coc-bases-th18/war",
    "https://basemelon.com/coc-bases-th18/trophy-defense",
    "https://basemelon.com/coc-bases-th18/legend",
  ];

  for (const categoryUrl of categories) {
    try {
      const html = await fetchHtml(categoryUrl);

      const links = new Set<string>();

      for (const pattern of sourceBasePattern("BaseMelon")) {
        for (const match of html.matchAll(pattern)) {
          const url = normalizeUrl(match[0], categoryUrl);

          if (url && isBaseMelonDetailUrl(url)) {
            links.add(url);
          }
        }
      }

      for (const href of extractHrefLinks(html, categoryUrl)) {
        if (isBaseMelonDetailUrl(href)) {
          links.add(href);
        }
      }

      console.log(
        `[BASE-POOL] BaseMelon: ${links.size} individuele bases uit ${categoryUrl}`,
      );

      for (const sourceUrl of links) {
        if (result.length >= MAX_CANDIDATES_PER_SOURCE) break;
        if (seen.has(sourceUrl)) continue;
        seen.add(sourceUrl);

        try {
          const base = await scrapeDetail(sourceUrl, "BaseMelon");

          if (base) {
            result.push(base);
          }
        } catch (error) {
          console.warn(
            `[BASE-POOL] BaseMelon: detail mislukt: ${sourceUrl}`,
            error,
          );
        }
      }
    } catch (error) {
      console.error(
        `[BASE-POOL] BaseMelon: categorie mislukt: ${categoryUrl}`,
        error,
      );
    }
  }

  return result;
}

async function collectClanWarden(): Promise<ScrapedBase[]> {
  const result: ScrapedBase[] = [];
  const seen = new Set<string>();

  const categories = [
    "https://clanwarden.com/bases/th18/war",
    "https://clanwarden.com/bases/th18/cwl",
    "https://clanwarden.com/bases/th18/trophy",
    "https://clanwarden.com/bases/th18/legend",
  ];

  for (const categoryUrl of categories) {
    try {
      const html = await fetchHtml(categoryUrl);
      const links = new Set<string>();

      for (const href of extractHrefLinks(html, categoryUrl)) {
        if (isClanWardenDetailUrl(href)) {
          links.add(href);
        }
      }

      for (const pattern of sourceBasePattern("ClanWarden")) {
        for (const match of html.matchAll(pattern)) {
          const url = normalizeUrl(match[0], categoryUrl);

          if (url && isClanWardenDetailUrl(url)) {
            links.add(url);
          }
        }
      }

      console.log(
        `[BASE-POOL] ClanWarden: ${links.size} individuele bases uit ${categoryUrl}`,
      );

      for (const sourceUrl of links) {
        if (result.length >= MAX_CANDIDATES_PER_SOURCE) break;
        if (seen.has(sourceUrl)) continue;
        seen.add(sourceUrl);

        try {
          const base = await scrapeDetail(sourceUrl, "ClanWarden");

          if (base) {
            result.push(base);
          }
        } catch (error) {
          console.warn(
            `[BASE-POOL] ClanWarden: detail mislukt: ${sourceUrl}`,
            error,
          );
        }
      }
    } catch (error) {
      console.error(
        `[BASE-POOL] ClanWarden: categorie mislukt: ${categoryUrl}`,
        error,
      );
    }
  }

  return result;
}

async function collectClashBaseLink(): Promise<ScrapedBase[]> {
  const result: ScrapedBase[] = [];
  const seen = new Set<string>();

  for (const listingUrl of [
    "https://clashbaselink.com/th18-base-layout/",
  ]) {
    try {
      const html = await fetchHtml(listingUrl);
      const links = new Set<string>();

      for (const href of extractHrefLinks(html, listingUrl)) {
        if (isClashBaseLinkDetailUrl(href)) {
          links.add(href);
        }
      }

      for (const pattern of sourceBasePattern("ClashBaseLink")) {
        for (const match of html.matchAll(pattern)) {
          const url = normalizeUrl(match[0], listingUrl);

          if (url && isClashBaseLinkDetailUrl(url)) {
            links.add(url);
          }
        }
      }

      console.log(
        `[BASE-POOL] ClashBaseLink: ${links.size} individuele bases uit ${listingUrl}`,
      );

      for (const sourceUrl of links) {
        if (result.length >= MAX_CANDIDATES_PER_SOURCE) break;
        if (seen.has(sourceUrl)) continue;
        seen.add(sourceUrl);

        try {
          const base = await scrapeDetail(sourceUrl, "ClashBaseLink");

          if (base) {
            result.push(base);
          }
        } catch (error) {
          console.warn(
            `[BASE-POOL] ClashBaseLink: detail mislukt: ${sourceUrl}`,
            error,
          );
        }
      }
    } catch (error) {
      console.error(
        `[BASE-POOL] ClashBaseLink: listing mislukt: ${listingUrl}`,
        error,
      );
    }
  }

  return result;
}

async function collectGenericProvider(
  config: SourceConfig,
): Promise<ScrapedBase[]> {
  const result: ScrapedBase[] = [];
  const seen = new Set<string>();

  for (const listingUrl of config.listingUrls) {
    try {
      const html = await fetchHtml(listingUrl);
      const links = new Set<string>();

      for (const pattern of sourceBasePattern(config.provider)) {
        for (const match of html.matchAll(pattern)) {
          const url = normalizeUrl(match[0], listingUrl);

          if (url) {
            links.add(url);
          }
        }
      }

      for (const href of extractHrefLinks(html, listingUrl)) {
        if (!looksLikeTh18Base(href)) {
          continue;
        }

        if (config.provider === "ClashFox" && isClashFoxDetailUrl(href)) {
          links.add(href);
        }

        if (config.provider === "CocMap" && isCocMapDetailUrl(href)) {
          links.add(href);
        }
      }

      console.log(
        `[BASE-POOL] ${config.provider}: ${links.size} kandidaatlinks uit ${listingUrl}`,
      );

      for (const sourceUrl of links) {
        if (result.length >= MAX_CANDIDATES_PER_SOURCE) break;
        if (seen.has(sourceUrl)) continue;
        seen.add(sourceUrl);

        try {
          const base = await scrapeDetail(
            sourceUrl,
            config.provider,
          );

          if (base) {
            result.push(base);
          }
        } catch (error) {
          console.warn(
            `[BASE-POOL] ${config.provider}: detail mislukt: ${sourceUrl}`,
            error,
          );
        }
      }
    } catch (error) {
      console.error(
        `[BASE-POOL] ${config.provider}: listing mislukt: ${listingUrl}`,
        error,
      );
    }
  }

  return result;
}

async function scrapeDetail(
  sourceUrl: string,
  provider: SourceProvider,
): Promise<ScrapedBase | null> {
  const html = await fetchHtml(sourceUrl);
  const visibleText = stripHtml(html);

  /*
   * Belangrijk:
   * We beoordelen de categorie NIET meer op de volledige pagina.
   * Een algemene websitepagina kan ergens "farm" noemen terwijl
   * de concrete base gewoon War/Trophy/Legend is.
   */

  if (!looksLikeTh18Base(`${sourceUrl} ${visibleText}`)) {
    console.log(
      `[BASE-POOL] ${provider}: geen TH18-base: ${sourceUrl}`,
    );
    return null;
  }

  const title =
    extractName(html) ?? "";

  /*
   * Categorie bepalen op basis van de concrete detail-URL en titel.
   * De volledige pagina mag NIET gebruikt worden voor de categorie:
   * BaseMelon/ClanWarden bevatten op iedere pagina algemene teksten
   * over Farm, Progress enzovoort.
   */
  const categoryText =
    `${sourceUrl} ${title}`;

  const normalizedCategoryText = categoryText
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (
    /\b(?:farm|farming|progress|progression|resource|loot)\b/i.test(
      normalizedCategoryText,
    )
  ) {
    console.log(
      `[BASE-POOL] ${provider}: basecategorie uitgesloten: ${sourceUrl}`,
    );
    return null;
  }

  if (!categoryIsAllowed(normalizedCategoryText)) {
    console.log(
      `[BASE-POOL] ${provider}: geen toegestane basecategorie: ${sourceUrl}`,
    );
    return null;
  }

  const imageUrl =
    extractFirstImage(html);

  const baseLink =
    extractCopyLink(html);

  const sourcePublishedAt =
    extractSourceDate(html, provider);

  if (
    !title ||
    !imageUrl ||
    !baseLink ||
    !sourcePublishedAt
  ) {
    console.warn(
      `[BASE-POOL] ${provider}: ontbrekende broninformatie: ${sourceUrl}`,
    );
    return null;
  }

  const now = new Date();

  if (!isFresh(sourcePublishedAt, now)) {
    console.log(
      `[BASE-POOL] ${provider}: ouder dan 48 uur: ${sourceUrl}`,
    );
    return null;
  }

  return {
    name: title.slice(0, 180),
    imageUrl,
    baseLink,
    sourceUrl,
    sourceProvider: provider,
    sourcePublishedAt,
  };
}

async function collectReddit(
  config: SourceConfig,
): Promise<ScrapedBase[]> {
  const result: ScrapedBase[] = [];

  function decodeXml(value: string): string {
    return value
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/gi, "'");
  }

  function stripCdata(value: string): string {
    return value
      .replace(/^<!\[CDATA\[/, "")
      .replace(/\]\]>$/, "")
      .trim();
  }

  function xmlField(entry: string, tag: string): string {
    const match = entry.match(
      new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"),
    );

    if (!match?.[1]) return "";

    return decodeXml(stripCdata(match[1])).trim();
  }

  function xmlLinks(entry: string): string[] {
    const links: string[] = [];

    const attrRegex =
      /<link[^>]+href=["']([^"']+)["'][^>]*>/gi;

    for (const match of entry.matchAll(attrRegex)) {
      if (match[1]) links.push(decodeXml(match[1]));
    }

    const textRegex =
      /https?:\/\/link\.clashofclans\.com\/[^\s<>"')\]]+/gi;

    for (const match of entry.matchAll(textRegex)) {
      if (match[0]) links.push(match[0]);
    }

    return [...new Set(links)];
  }

  for (const listingUrl of config.listingUrls) {
    try {
      let raw = "";

      try {
        raw = await fetchHtml(listingUrl);
      } catch {
        const fallbackUrl = listingUrl.replace(
          "www.reddit.com",
          "old.reddit.com",
        );

        if (fallbackUrl !== listingUrl) {
          raw = await fetchHtml(fallbackUrl);
        } else {
          throw new Error("Reddit-feed kon niet worden opgehaald.");
        }
      }

      const entries = raw.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];

      console.log(
        `[BASE-POOL] ${config.provider}: ${entries.length} RSS/Atom entries gevonden via ${listingUrl}`,
      );

      for (const entry of entries) {
        const title = xmlField(entry, "title");
        const content = xmlField(entry, "content");
        const summary = xmlField(entry, "summary");
        const combined = `${title} ${content} ${summary}`;

        if (!looksLikeTh18Base(combined)) continue;

        const normalized = combined
          .replace(/[-_/]+/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        if (
          /\b(?:farm|farming|progress|progression|resource|loot)\b/i.test(
            normalized,
          )
        ) {
          continue;
        }

        if (!categoryIsAllowed(normalized)) continue;

        const dateText =
          xmlField(entry, "updated") ||
          xmlField(entry, "published");

        const sourcePublishedAt = parseDate(dateText);

        if (!sourcePublishedAt) continue;

        const oldestAllowed = new Date(
          Date.now() - MAX_BASE_AGE_HOURS * 60 * 60 * 1000,
        );

        if (
          sourcePublishedAt < oldestAllowed ||
          sourcePublishedAt > new Date()
        ) {
          continue;
        }

        const clashLinks = combined.match(
          /https?:\/\/link\.clashofclans\.com\/[^\s<>"')\]]+/gi,
        ) ?? [];

        const links = [
          ...clashLinks,
          ...xmlLinks(entry),
        ];

        const baseLink = links.find((link) =>
          /^https?:\/\/link\.clashofclans\.com\//i.test(link),
        );

        if (!baseLink) continue;

        const imageMatch = combined.match(
          /https?:\/\/[^\s<>"')\]]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s<>"')\]]*)?/i,
        );

        const imageUrl =
          imageMatch?.[0] ??
          "https://www.redditstatic.com/desktop2x/img/favicon/favicon-32x32.png";

        result.push({
          name: title || `TH18 Base via ${config.provider}`,
          imageUrl,
          baseLink,
          sourceUrl: listingUrl,
          sourceProvider: config.provider,
          sourcePublishedAt,
        });

        if (result.length >= MAX_CANDIDATES_PER_SOURCE) {
          return result;
        }
      }
    } catch (error) {
      console.warn(
        `[BASE-POOL] ${config.provider}: Reddit-feed mislukt: ${listingUrl}`,
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
    config.provider === "RedditCoCBaseLink" ||
    config.provider === "RedditCOCBaseLayouts"
  ) {
    return collectReddit(config);
  }

  if (config.provider === "BaseMelon") {
    return collectBaseMelon();
  }

  if (config.provider === "ClanWarden") {
    return collectClanWarden();
  }

  if (config.provider === "ClashBaseLink") {
    return collectClashBaseLink();
  }

  return collectGenericProvider(config);
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

  const oldestAllowed =
    new Date(
      now.getTime() -
        MAX_BASE_AGE_HOURS *
          60 *
          60 *
          1000,
    );

  /*
   * Centrale schoonmaak:
   * ALLE automatische bronnen vallen hieronder.
   * TDG-eigen bases hebben sourceProvider = null
   * en worden dus nooit geraakt.
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

  const collected: ScrapedBase[] =
    [];

  const sourceResults: {
    provider: SourceProvider;
    candidates: number;
    accepted: number;
  }[] = [];

  for (
    const source of SOURCES
  ) {
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
      `[BASE-POOL] ${source.provider}: ${bases.length} verse bases.`,
    );
  }

  /*
   * Centrale security filter.
   *
   * Geen source mag deze regels omzeilen:
   * - bestaande Clash-link = reject
   * - dubbele Clash-link = reject
   * - ouder dan 48 uur = reject
   * - maximaal 35
   *
   * Alles wordt op versheid gesorteerd.
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
        (
          base,
          index,
          all,
        ) =>
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

  if (
    !combined.length
  ) {
    console.warn(
      "[BASE-POOL] Geen enkele verse base voldeed aan alle beveiligingsregels.",
    );

    return {
      imported: 0,
      total: 0,
      target: TOTAL_POOL_LIMIT,
      maxAgeHours:
        MAX_BASE_AGE_HOURS,
      sources:
        sourceResults,
    };
  }

  await prisma.base.createMany({
    data:
      combined.map(
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

  const finalSources =
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
    );

  console.log(
    `[BASE-POOL] ========================================`,
  );

  console.log(
    `[BASE-POOL] ${combined.length}/${TOTAL_POOL_LIMIT} bases geïmporteerd.`,
  );

  for (
    const source of
    finalSources
  ) {
    console.log(
      `[BASE-POOL] ${source.provider}: ${source.imported}`,
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
      finalSources,
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
    } catch (
      error
    ) {
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
