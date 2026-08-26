import fs from "node:fs/promises";
import path from "node:path";

const ROOT =
  "/var/lib/phoenix/clash-game-data";

const THS = [
  13,
  14,
  15,
  16,
  17,
  18,
];

const DIFFICULTIES = [
  "OH_MY_GOD",
  "OH_HELL_NO",
  "FUCK_MY_LIFE",
];

async function readJson(file) {
  return JSON.parse(
    await fs.readFile(file, "utf8")
  );
}

async function readCategory(category) {
  const directory =
    path.join(ROOT, category);

  const files = (
    await fs.readdir(directory)
  )
    .filter((name) =>
      name.endsWith(".json")
    )
    .sort();

  return Promise.all(
    files.map((name) =>
      readJson(
        path.join(
          directory,
          name
        )
      )
    )
  );
}

function numberValue(value) {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : null;
}

function housing(item) {
  const direct =
    numberValue(
      item.housingSpace
    );

  if (direct !== null) {
    return direct;
  }

  for (
    const level of (
      item.levels ?? []
    )
  ) {
    const value =
      numberValue(
        level.housingSpace
      );

    if (value !== null) {
      return value;
    }
  }

  return 1;
}

function available(
  item,
  th
) {
  if (
    Array.isArray(
      item.availablePerTownHall
    )
  ) {
    const row =
      item.availablePerTownHall.find(
        (entry) =>
          numberValue(
            entry.townHallLevel
          ) === th
      );

    if (row) {
      return (
        numberValue(
          row.count
        ) ?? 0
      ) > 0;
    }
  }

  return (
    item.levels ?? []
  ).some(
    (level) =>
      (
        numberValue(
          level.townHallRequired
        ) ?? Infinity
      ) <= th
  );
}

function randomInt(
  min,
  max
) {
  return Math.floor(
    Math.random() *
      (max - min + 1)
  ) + min;
}

function shuffled(items) {
  const copy = [...items];

  for (
    let i = copy.length - 1;
    i > 0;
    i--
  ) {
    const j =
      randomInt(0, i);

    [
      copy[i],
      copy[j],
    ] = [
      copy[j],
      copy[i],
    ];
  }

  return copy;
}

function fill(
  items,
  capacity
) {
  const candidates =
    items
      .map((item) => ({
        item,
        housing:
          housing(item),
      }))
      .filter(
        (entry) =>
          entry.housing > 0 &&
          entry.housing <=
            capacity
      );

  for (
    let attempt = 0;
    attempt < 10000;
    attempt++
  ) {
    let remaining =
      capacity;

    const result = [];

    while (
      remaining > 0
    ) {
      const possible =
        candidates.filter(
          (entry) =>
            entry.housing <=
            remaining
        );

      if (
        possible.length === 0
      ) {
        break;
      }

      const chosen =
        possible[
          randomInt(
            0,
            possible.length - 1
          )
        ];

      result.push(chosen);
      remaining -=
        chosen.housing;
    }

    if (
      remaining === 0
    ) {
      return result;
    }
  }

  throw new Error(
    `Geen combinatie voor capaciteit ${capacity}`
  );
}

const [
  troops,
  spells,
  siege,
  capacity,
] = await Promise.all([
  readCategory("troops"),
  readCategory("spells"),
  readCategory(
    "siege-machines"
  ),
  readJson(
    path.join(
      ROOT,
      "capacity.json"
    )
  ),
]);

for (
  const th of THS
) {
  const limits =
    capacity.townHalls[
      String(th)
    ];

  const availableTroops =
    troops.filter(
      (item) =>
        available(
          item,
          th
        )
    );

  const availableSpells =
    spells.filter(
      (item) =>
        available(
          item,
          th
        )
    );

  const availableSiege =
    siege.filter(
      (item) =>
        available(
          item,
          th
        )
    );

  for (
    const difficulty of
    DIFFICULTIES
  ) {
    const army =
      fill(
        availableTroops,
        limits.troopCapacity
      );

    const armySpells =
      fill(
        availableSpells,
        limits.spellCapacity
      );

    const cc =
      fill(
        availableTroops,
        th >= 17
          ? 55
          : th >= 15
            ? 50
            : 45
      );

    const ccSpells =
      fill(
        availableSpells,
        th === 18
          ? 4
          : th >= 14
            ? 3
            : 2
      );

    const totalArmy =
      army.reduce(
        (sum, entry) =>
          sum +
          entry.housing,
        0
      );

    const totalSpells =
      armySpells.reduce(
        (sum, entry) =>
          sum +
          entry.housing,
        0
      );

    const totalCC =
      cc.reduce(
        (sum, entry) =>
          sum +
          entry.housing,
        0
      );

    const totalCCSpells =
      ccSpells.reduce(
        (sum, entry) =>
          sum +
          entry.housing,
        0
      );

    if (
      totalArmy !==
      limits.troopCapacity
    ) {
      throw new Error(
        `TH${th} ${difficulty}: army ${totalArmy}/${limits.troopCapacity}`
      );
    }

    if (
      totalSpells !==
      limits.spellCapacity
    ) {
      throw new Error(
        `TH${th} ${difficulty}: spells ${totalSpells}/${limits.spellCapacity}`
      );
    }

    if (
      totalCC !==
      (
        th >= 17
          ? 55
          : th >= 15
            ? 50
            : 45
      )
    ) {
      throw new Error(
        `TH${th} ${difficulty}: CC ${totalCC}`
      );
    }

    if (
      totalCCSpells !==
      (
        th === 18
          ? 4
          : th >= 14
            ? 3
            : 2
      )
    ) {
      throw new Error(
        `TH${th} ${difficulty}: CC spells ${totalCCSpells}`
      );
    }

    if (
      availableSiege.length ===
      0
    ) {
      throw new Error(
        `TH${th}: geen siege machine beschikbaar`
      );
    }

    console.log(
      `✓ TH${th} ${difficulty} — ${totalArmy}/${limits.troopCapacity} troops — ${totalSpells}/${limits.spellCapacity} spells — CC ${totalCC}/${th >= 17 ? 55 : th >= 15 ? 50 : 45} + ${totalCCSpells}/${th === 18 ? 4 : th >= 14 ? 3 : 2} — siege 1`
    );
  }
}

console.log("");
console.log(
  "🎲 Random Army Engine basiscontrole geslaagd."
);
