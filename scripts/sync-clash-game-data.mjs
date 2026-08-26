import fs from "node:fs/promises";
import path from "node:path";

const REPO = "chiefpansancolt/clash-of-clans-data";
const BRANCH = "main";
const API_BASE = `https://api.github.com/repos/${REPO}`;
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;

const DATA_ROOT = "/var/lib/phoenix/clash-game-data";
const STAGING_ROOT = `/var/lib/phoenix/.clash-game-data-staging-${process.pid}`;
const BACKUP_ROOT = "/var/lib/phoenix/clash-game-data.previous";

const CATEGORIES = [
  "troops",
  "spells",
  "siege-machines",
  "heroes",
  "hero-equipment",
  "pets",
  "army-buildings",
  "resource-buildings",
];

const TOWN_HALLS = [13, 14, 15, 16, 17, 18];

const BOOTSTRAP_LIMITS = {
  13: { troopCapacity: 300, spellCapacity: 11, siegeCapacity: 1 },
  14: { troopCapacity: 300, spellCapacity: 11, siegeCapacity: 1 },
  15: { troopCapacity: 320, spellCapacity: 11, siegeCapacity: 1 },
  16: { troopCapacity: 320, spellCapacity: 11, siegeCapacity: 1 },
  17: { troopCapacity: 340, spellCapacity: 11, siegeCapacity: 1 },
  18: { troopCapacity: 352, spellCapacity: 11, siegeCapacity: 1 },
};

const CAPACITY_SOURCE_BASE = "https://clashest.com/coc/army/th";

function headers() {
  return {
    "User-Agent": "TDG-Phoenix-GameDataSync/1.0",
    Accept: "application/vnd.github+json",
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: headers(),
    cache: "no-store",
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} bij ${url}: ${text.slice(0, 500)}`
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Ongeldige JSON ontvangen van ${url}`);
  }
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: headers(),
    cache: "no-store",
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} bij ${url}: ${text.slice(0, 500)}`
    );
  }

  return text;
}

async function getCurrentCommit() {
  const commit = await fetchJson(`${API_BASE}/commits/${BRANCH}`);

  if (!commit.sha) {
    throw new Error("GitHub gaf geen commit SHA terug.");
  }

  return {
    sha: commit.sha,
    message: commit.commit?.message ?? "",
  };
}

async function getCategoryFiles(category) {
  const url = `${API_BASE}/contents/data/home/${category}?ref=${encodeURIComponent(
    BRANCH
  )}`;

  const entries = await fetchJson(url);

  if (!Array.isArray(entries)) {
    throw new Error(`GitHub gaf geen bestandenlijst voor ${category}.`);
  }

  return entries
    .filter(
      (entry) =>
        entry.type === "file" &&
        typeof entry.name === "string" &&
        entry.name.endsWith(".json")
    )
    .map((entry) => ({
      name: entry.name,
      path: entry.path,
    }));
}

async function ensureCleanStart() {
  await fs.rm(STAGING_ROOT, { recursive: true, force: true });
  await fs.mkdir(STAGING_ROOT, { recursive: true });
}

async function downloadCategory(category, files) {
  const categoryRoot = path.join(STAGING_ROOT, category);
  await fs.mkdir(categoryRoot, { recursive: true });

  const concurrency = 8;
  let index = 0;

  async function worker() {
    while (true) {
      const currentIndex = index++;

      if (currentIndex >= files.length) {
        return;
      }

      const file = files[currentIndex];
      const rawUrl = `${RAW_BASE}/${file.path}`;

      const text = await fetchText(rawUrl);

      try {
        JSON.parse(text);
      } catch {
        throw new Error(
          `Ongeldige JSON in ${file.path}. Update wordt afgebroken.`
        );
      }

      await fs.writeFile(
        path.join(categoryRoot, file.name),
        text.endsWith("\n") ? text : `${text}\n`,
        "utf8"
      );
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, files.length) },
      () => worker()
    )
  );
}

async function fetchCurrentCapacityData() {
  const limits = {};

  for (const townHall of TOWN_HALLS) {
    const url = `${CAPACITY_SOURCE_BASE}${townHall}`;
    const html = await fetchText(url);
    const normalized = html.replace(/\s+/g, " ");

    const match = normalized.match(
      /Army camps\s+(\d+)\s+housing.*?Spells\s+(\d+)\s+space.*?Siege\s+(\d+)\s+machine/i
    );

    if (!match) {
      throw new Error(
        `Kan actuele capaciteit voor TH${townHall} niet uitlezen.`
      );
    }

    limits[townHall] = {
      troopCapacity: Number(match[1]),
      spellCapacity: Number(match[2]),
      siegeCapacity: Number(match[3]),
    };
  }

  return {
    source: CAPACITY_SOURCE_BASE,
    syncedAt: new Date().toISOString(),
    townHalls: limits,
  };
}

async function writeCapacityData() {
  const target = path.join(STAGING_ROOT, "capacity.json");

  try {
    const current = await fetchCurrentCapacityData();

    await fs.writeFile(
      target,
      `${JSON.stringify(current, null, 2)}\n`,
      "utf8"
    );

    console.log("✓ Actuele TH-capaciteiten gecontroleerd");
    return;
  } catch (error) {
    const existingPath = path.join(DATA_ROOT, "capacity.json");

    try {
      const existing = await fs.readFile(existingPath, "utf8");
      JSON.parse(existing);

      await fs.writeFile(target, existing, "utf8");

      console.warn(
        "⚠ Capaciteitsbron tijdelijk niet beschikbaar; bestaande cache behouden."
      );

      return;
    } catch {
      const bootstrap = {
        source:
          "Phoenix bootstrap fallback; automatisch vervangen bij volgende succesvolle sync",
        syncedAt: new Date().toISOString(),
        townHalls: BOOTSTRAP_LIMITS,
      };

      await fs.writeFile(
        target,
        `${JSON.stringify(bootstrap, null, 2)}\n`,
        "utf8"
      );

      console.warn(
        "⚠ Geen bestaande capaciteit-cache; bootstrapwaarden gebruikt."
      );
    }
  }
}

async function writeMetadata(commit, fileCount) {
  const metadata = {
    source: `https://github.com/${REPO}`,
    repository: REPO,
    branch: BRANCH,
    sourceCommit: commit.sha,
    sourceCommitMessage: commit.message,
    syncedAt: new Date().toISOString(),
    fileCount,
    categories: CATEGORIES,
  };

  await fs.writeFile(
    path.join(STAGING_ROOT, "metadata.json"),
    `${JSON.stringify(metadata, null, 2)}\n`,
    "utf8"
  );
}

async function swapIntoPlace() {
  await fs.rm(BACKUP_ROOT, { recursive: true, force: true });

  let movedOld = false;

  try {
    try {
      await fs.rename(DATA_ROOT, BACKUP_ROOT);
      movedOld = true;
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    await fs.rename(STAGING_ROOT, DATA_ROOT);

    await fs.rm(BACKUP_ROOT, {
      recursive: true,
      force: true,
    });
  } catch (error) {
    await fs.rm(DATA_ROOT, {
      recursive: true,
      force: true,
    });

    if (movedOld) {
      await fs.rename(BACKUP_ROOT, DATA_ROOT);
    }

    throw error;
  }
}

async function main() {
  console.log("🐦‍🔥 Phoenix Clash Game Data Sync");
  console.log(`Bron: ${REPO}@${BRANCH}`);
  console.log("");

  await ensureCleanStart();

  const commit = await getCurrentCommit();

  console.log(`GitHub commit: ${commit.sha}`);
  console.log("");

  let totalFiles = 0;

  for (const category of CATEGORIES) {
    console.log(`→ Ophalen: ${category}`);

    const files = await getCategoryFiles(category);

    if (files.length === 0) {
      throw new Error(
        `Geen JSON-bestanden gevonden voor categorie '${category}'.`
      );
    }

    await downloadCategory(category, files);

    totalFiles += files.length;

    console.log(`  ✓ ${files.length} bestanden`);
  }

  if (totalFiles < 20) {
    throw new Error(
      `Te weinig game-data ontvangen (${totalFiles} bestanden). Update geweigerd.`
    );
  }

  await writeCapacityData();
  await writeMetadata(commit, totalFiles);
  await swapIntoPlace();

  console.log("");
  console.log("✅ Game-data succesvol bijgewerkt.");
  console.log(`   Bestanden: ${totalFiles}`);
  console.log(`   Locatie:   ${DATA_ROOT}`);
  console.log(`   Commit:    ${commit.sha}`);
}

main().catch(async (error) => {
  console.error("");
  console.error("❌ Game-data sync mislukt.");
  console.error(
    error instanceof Error ? error.message : error
  );

  await fs.rm(STAGING_ROOT, {
    recursive: true,
    force: true,
  });

  process.exit(1);
});
