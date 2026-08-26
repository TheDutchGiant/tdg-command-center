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

function latestLevel(
  building,
  townHall
) {
  return (
    building.levels ?? []
  )
    .filter(
      (level) =>
        (numberValue(
          level.townHallRequired
        ) ?? Infinity) <=
        townHall
    )
    .at(-1) ?? null;
}

function hasTownHall(
  item,
  townHall
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
          ) === townHall
      );

    if (row) {
      return (
        numberValue(row.count) ?? 0
      ) > 0;
    }
  }

  return (
    item.levels ?? []
  ).some(
    (level) =>
      (numberValue(
        level.townHallRequired
      ) ?? Infinity) <=
      townHall
  );
}

const [
  troops,
  spells,
  siegeMachines,
  heroes,
  equipment,
  pets,
  armyBuildings,
  resourceBuildings,
  capacity,
] = await Promise.all([
  readCategory("troops"),
  readCategory("spells"),
  readCategory(
    "siege-machines"
  ),
  readCategory("heroes"),
  readCategory(
    "hero-equipment"
  ),
  readCategory("pets"),
  readCategory(
    "army-buildings"
  ),
  readCategory(
    "resource-buildings"
  ),
  readJson(
    path.join(
      ROOT,
      "capacity.json"
    )
  ),
]);

const findById = (
  items,
  id
) =>
  items.find(
    (item) => item.id === id
  );

const clanCastle =
  findById(
    resourceBuildings,
    "clan-castle"
  );

const heroHall =
  findById(
    armyBuildings,
    "hero-hall"
  );

const blacksmith =
  findById(
    armyBuildings,
    "blacksmith"
  );

const petHouse =
  findById(
    armyBuildings,
    "pet-house"
  );

for (const th of THS) {
  const limits =
    capacity.townHalls[
      String(th)
    ];

  const cc =
    latestLevel(
      clanCastle,
      th
    );

  const hall =
    latestLevel(
      heroHall,
      th
    );

  const smith =
    latestLevel(
      blacksmith,
      th
    );

  const petHouseLevel =
    latestLevel(
      petHouse,
      th
    );

  const heroIds =
    Object.keys(
      hall?.heroLevelCaps ?? {}
    );

  const equipmentCount =
    equipment.filter(
      (item) =>
        (
          item.levels ?? []
        ).some(
          (level) =>
            (
              numberValue(
                level.blacksmithLevelRequired
              ) ?? Infinity
            ) <=
            (
              numberValue(
                smith?.level
              ) ?? 0
            )
        )
    ).length;

  const petNames =
    new Set();

  for (
    const level of (
      petHouse?.levels ?? []
    )
  ) {
    if (
      (
        numberValue(
          level.level
        ) ?? 0
      ) <=
      (
        numberValue(
          petHouseLevel?.level
        ) ?? 0
      )
    ) {
      if (
        typeof level.unlockedPet ===
        "string"
      ) {
        petNames.add(
          level.unlockedPet
            .replace(
              /[^a-z0-9]/gi,
              ""
            )
            .toLowerCase()
        );
      }
    }
  }

  const petCount =
    pets.filter(
      (pet) =>
        petNames.has(
          String(
            pet.name ?? ""
          )
            .replace(
              /[^a-z0-9]/gi,
              ""
            )
            .toLowerCase()
        )
    ).length;

  const troopCount =
    troops.filter(
      (item) =>
        hasTownHall(
          item,
          th
        )
    ).length;

  const spellCount =
    spells.filter(
      (item) =>
        hasTownHall(
          item,
          th
        )
    ).length;

  const siegeCount =
    siegeMachines.filter(
      (item) =>
        hasTownHall(
          item,
          th
        )
    ).length;

  console.log("");
  console.log(
    `========== TH${th} ==========`
  );

  console.log(
    `Troop capacity : ${limits.troopCapacity}`
  );

  console.log(
    `Spell capacity : ${limits.spellCapacity}`
  );

  console.log(
    `Siege capacity : ${limits.siegeCapacity}`
  );

  console.log(
    `CC             : ${cc?.troopCapacity ?? 0} troops / ${cc?.spellCapacity ?? 0} spells / 0 siege`
  );

  console.log(
    `Heroes         : ${heroIds.length} available / ${hall?.heroSlots ?? 0} active`
  );

  console.log(
    `Equipment      : ${equipmentCount}`
  );

  console.log(
    `Pets           : ${petCount} available / 4 active`
  );

  console.log(
    `Troops         : ${troopCount}`
  );

  console.log(
    `Spells         : ${spellCount}`
  );

  console.log(
    `Siege machines : ${siegeCount}`
  );
}

console.log("");
console.log(
  "🐦‍🔥 Capability check afgerond."
);
