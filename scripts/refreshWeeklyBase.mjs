import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SOURCE_PAGE =
  "https://clashbaselink.com/th18-base-layout/";

const UPLOAD_DIR =
  path.join(
    process.cwd(),
    "public",
    "uploads",
    "bases",
  );

const PUBLIC_PREFIX =
  "/uploads/bases/";

function absoluteUrl(
  value,
  base,
) {
  try {
    return new URL(
      value,
      base,
    ).toString();
  } catch {
    return null;
  }
}

async function fetchText(url) {
  const response =
    await fetch(
      url,
      {
        headers: {
          "User-Agent":
            "TDG-Phoenix/1.0 weekly base updater",
          Accept:
            "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      },
    );

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} bij ${url}`,
    );
  }

  return response.text();
}

function extractBaseUrls(html) {
  const urls =
    new Set();

  const regex =
    /href=["']([^"']+)["']/gi;

  let match;

  while (
    (match = regex.exec(html)) !== null
  ) {
    const href =
      match[1];

    const url =
      absoluteUrl(
        href,
        SOURCE_PAGE,
      );

    if (!url) {
      continue;
    }

    const parsed =
      new URL(url);

    if (
      parsed.hostname !==
      "clashbaselink.com"
    ) {
      continue;
    }

    if (
      !/^\/th18-.*-base\/?$/i.test(
        parsed.pathname,
      )
    ) {
      continue;
    }

    urls.add(
      url,
    );
  }

  return [
    ...urls,
  ];
}

function extractTitle(html) {
  const titleMatch =
    html.match(
      /<h1[^>]*>([\s\S]*?)<\/h1>/i,
    );

  if (titleMatch) {
    return titleMatch[1]
      .replace(/<[^>]+>/g, "")
      .replace(
        /&amp;/g,
        "&",
      )
      .replace(
        /&#8211;|&ndash;/g,
        "–",
      )
      .replace(
        /&#8212;|&mdash;/g,
        "—",
      )
      .replace(
        /&nbsp;/g,
        " ",
      )
      .trim();
  }

  return "TH18 Base van de Week";
}

function extractImageUrl(
  html,
  pageUrl,
) {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
  ];

  for (
    const pattern of patterns
  ) {
    const match =
      html.match(
        pattern,
      );

    if (
      match?.[1]
    ) {
      return absoluteUrl(
        match[1],
        pageUrl,
      );
    }
  }

  return null;
}

function extractClashLink(
  html,
) {
  const regex =
    /href=["'](https:\/\/link\.clashofclans\.com\/[^"']+)["']/gi;

  const match =
    regex.exec(html);

  return match?.[1]
    ? match[1].replace(
        /&amp;/g,
        "&",
      )
    : null;
}

async function downloadImage(
  imageUrl,
) {
  const response =
    await fetch(
      imageUrl,
      {
        headers: {
          "User-Agent":
            "TDG-Phoenix/1.0 weekly base updater",
        },
        redirect: "follow",
      },
    );

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} bij afbeelding`,
    );
  }

  const contentType =
    response.headers.get(
      "content-type",
    ) ?? "";

  let extension =
    ".jpg";

  if (
    contentType.includes(
      "png",
    )
  ) {
    extension = ".png";
  } else if (
    contentType.includes(
      "webp",
    )
  ) {
    extension = ".webp";
  } else if (
    contentType.includes(
      "jpeg",
    )
  ) {
    extension = ".jpg";
  }

  const buffer =
    Buffer.from(
      await response.arrayBuffer(),
    );

  const hash =
    crypto
      .createHash(
        "sha256",
      )
      .update(buffer)
      .digest("hex")
      .slice(0, 20);

  const filename =
    `th18-${hash}${extension}`;

  const absolutePath =
    path.join(
      UPLOAD_DIR,
      filename,
    );

  await fs.writeFile(
    absolutePath,
    buffer,
  );

  return {
    filename,
    publicUrl:
      `${PUBLIC_PREFIX}${filename}`,
  };
}

async function pickFreshBase() {
  console.log(
    "===== CLASHBASELINK TH18 =====",
  );

  const html =
    await fetchText(
      SOURCE_PAGE,
    );

  /*
   * De TH18-pagina bestaat uit opeenvolgende
   * <h2>-blokken.
   *
   * Elk blok bevat:
   * - de naam van de base
   * - één of meerdere afbeeldingen
   * - één OpenLayout-link
   *
   * We gebruiken de EERSTE afbeelding en de
   * EERSTE OpenLayout-link uit ieder blok.
   */
  const sections = [];

  const sectionRegex =
    /<h2[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2[^>]*>|<\/article>)/gi;

  let match;

  while (
    (match = sectionRegex.exec(html)) !== null
  ) {
    const rawTitle =
      match[1] ?? "";

    const sectionHtml =
      match[2] ?? "";

    const title =
      rawTitle
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&#8211;|&ndash;/g, "–")
        .replace(/&#8212;|&mdash;/g, "—")
        .replace(/&nbsp;/g, " ")
        .trim();

    if (
      !/^TH18\b/i.test(
        title,
      )
    ) {
      continue;
    }

    const imageMatch =
      sectionHtml.match(
        /<img[^>]+src=["']([^"']+)["']/i,
      );

    const clashMatch =
      sectionHtml.match(
        /href=["'](https:\/\/link\.clashofclans\.com\/[^"']*action=OpenLayout[^"']*)["']/i,
      );

    if (
      !imageMatch?.[1] ||
      !clashMatch?.[1]
    ) {
      continue;
    }

    const imageUrl =
      absoluteUrl(
        imageMatch[1],
        SOURCE_PAGE,
      );

    const baseLink =
      clashMatch[1].replace(
        /&amp;/g,
        "&",
      );

    if (
      !imageUrl ||
      !baseLink
    ) {
      continue;
    }

    sections.push({
      title:
        title ||
        "TH18 Base van de Week",
      pageUrl:
        SOURCE_PAGE,
      imageUrl,
      baseLink,
    });
  }

  console.log(
    `Geldige TH18 bases gevonden: ${sections.length}`,
  );

  if (
    !sections.length
  ) {
    throw new Error(
      "Geen geldige TH18-bases gevonden op ClashBaseLink.",
    );
  }

  /*
   * Willekeurige geldige base kiezen.
   */
  const shuffled =
    [...sections];

  for (
    let i =
      shuffled.length - 1;
    i > 0;
    i--
  ) {
    const j =
      Math.floor(
        Math.random() *
          (i + 1),
      );

    [
      shuffled[i],
      shuffled[j],
    ] = [
      shuffled[j],
      shuffled[i],
    ];
  }

  const selected =
    shuffled[0];

  console.log(
    `Gekozen base: ${selected.title}`,
  );

  console.log(
    `Afbeelding: ${selected.imageUrl}`,
  );

  console.log(
    `Clash-link: ${selected.baseLink}`,
  );

  return selected;
}

async function main() {
  await fs.mkdir(
    UPLOAD_DIR,
    {
      recursive: true,
    },
  );

  const now =
    new Date();

  const active =
    await prisma.base.findFirst({
      where: {
        townHall: 18,
        isActive: true,
        expiresAt: {
          gt: now,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  if (active) {
    console.log(
      "============================================================",
    );
    console.log(
      " BASE VAN DE WEEK",
    );
    console.log(
      "============================================================",
    );
    console.log(
      `Actieve base: ${active.name}`,
    );
    console.log(
      `Geldig tot: ${active.expiresAt?.toISOString() ?? "onbekend"}`,
    );
    console.log(
      "Geen nieuwe base nodig.",
    );
    return;
  }

  console.log(
    "Geen geldige actieve TH18-base.",
  );
  console.log(
    "Nieuwe base ophalen...",
  );

  const base =
    await pickFreshBase();

  console.log(
    `Gekozen: ${base.title}`,
  );

  console.log(
    `Clash-link: ${base.baseLink}`,
  );

  console.log(
    `Afbeelding: ${base.imageUrl}`,
  );

  const image =
    await downloadImage(
      base.imageUrl,
    );

  const expiresAt =
    new Date(
      now.getTime() +
        7 *
          24 *
          60 *
          60 *
          1000,
    );

  await prisma.$transaction([
    prisma.base.updateMany({
      where: {
        townHall: 18,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    }),

    prisma.base.create({
      data: {
        townHall: 18,
        category: "Challenge",
        name:
          base.title,
        description:
          `Automatisch geselecteerd via ClashBaseLink · ${base.pageUrl}`,
        baseLink:
          base.baseLink,
        imageUrl:
          image.publicUrl,
        createdBy:
          "ClashBaseLink",
        expiresAt,
        isActive:
          true,
      },
    }),
  ]);

  console.log(
    "============================================================",
  );
  console.log(
    " NIEUWE BASE VAN DE WEEK ACTIEF",
  );
  console.log(
    "============================================================",
  );
  console.log(
    `Naam       : ${base.title}`,
  );
  console.log(
    `Afbeelding : ${image.publicUrl}`,
  );
  console.log(
    `Clash link : ${base.baseLink}`,
  );
  console.log(
    `Geldig tot : ${expiresAt.toISOString()}`,
  );
}

main()
  .catch(
    (error) => {
      console.error(
        "Weekly base updater error:",
        error,
      );
      process.exitCode = 1;
    },
  )
  .finally(
    () =>
      prisma.$disconnect(),
  );
