const UNIT_IDS: Record<string, number> = {
  Barbarian: 0,
  Archer: 1,
  Goblin: 2,
  Giant: 3,
  "Wall Breaker": 4,
  Balloon: 5,
  Wizard: 6,
  Healer: 7,
  Dragon: 8,
  "P.E.K.K.A": 9,
  Minion: 10,
  "Hog Rider": 11,
  Valkyrie: 12,
  Golem: 13,
  Witch: 15,
  "Lava Hound": 17,
  Bowler: 22,
  "Baby Dragon": 23,
  Miner: 24,
  "Super Barbarian": 26,
  "Super Archer": 27,
  "Super Wall Breaker": 28,
  "Super Giant": 29,
  "Ice Wizard": 30,
  "Battle Ram": 45,
  "Royal Ghost": 47,
  "Pumpkin Barbarian": 48,
  "Giant Skeleton": 50,
  "Wall Wrecker": 51,
  "Battle Blimp": 52,
  Yeti: 53,
  "Sneaky Goblin": 55,
  "Super Miner": 56,
  "Rocket Balloon": 57,
  "Ice Golem": 58,
  "Electro Dragon": 59,
  "Skeleton Barrel": 61,
  "Stone Slammer": 62,
  "Inferno Dragon": 63,
  "Super Valkyrie": 64,
  "Dragon Rider": 65,
  "Super Witch": 66,
  "El Primo": 67,
  "Party Wizard": 72,
  "Siege Barracks": 75,
  "Ice Hound": 76,
  "Super Bowler": 80,
  "Super Dragon": 81,
  Headhunter: 82,
  "Super Wizard": 83,
  "Super Minion": 84,
  "Log Launcher": 87,
  "Flame Flinger": 91,
  "Battle Drill": 92,
  "Electro Titan": 95,
  "Apprentice Warden": 97,
  "Super Hog": 98,
  "Root Rider": 110,
  Firecracker: 119,
  "Azure Dragon": 120,
  Druid: 123,
  Thrower: 132,
  "Troop Launcher": 135,
  "Snake Barrel": 142,
  "Super Yeti": 147,
  Furnace: 150,
};

const SPELL_IDS: Record<string, number> = {
  "Lightning Spell": 0,
  "Healing Spell": 1,
  "Rage Spell": 2,
  "Jump Spell": 3,
  "Santa's Surprise": 4,
  "Freeze Spell": 5,
  "Poison Spell": 9,
  "Earthquake Spell": 10,
  "Haste Spell": 11,
  "Birthday Boom": 22,
  "Clone Spell": 16,
  "Skeleton Spell": 17,
  "Bat Spell": 28,
  "Invisibility Spell": 35,
  "Recall Spell": 53,
  "Overgrowth Spell": 70,
  "Revive Spell": 98,
};

const HERO_IDS: Record<string, string> = {
  "Barbarian King": "0",
  "Archer Queen": "1",
  "Grand Warden": "2",
  "Royal Champion": "4",
  "Minion Prince": "6",
  "Dragon Duke": "7",
};

type ArmyItem = {
  name: string;
  quantity: number;
};

type ArmyHero = {
  name: string;
  equipment?: string[];
};

type Army = {
  troops?: ArmyItem[];
  spells?: ArmyItem[];
  siegeMachine?: {
    name: string;
    quantity?: number;
  } | null;
  heroes?: ArmyHero[];
  clanCastleTroops?: ArmyItem[];
  clanCastleSpells?: ArmyItem[];
};

function encodeItems(
  items: ArmyItem[],
  ids: Record<string, number>
): string {
  return items
    .filter((item) => ids[item.name] !== undefined && item.quantity > 0)
    .map(
      (item) =>
        `${item.quantity}x${ids[item.name]}`
    )
    .join("-");
}

export function buildArmyLink(army: Army): string {
  const parts: string[] = [];

  const troops = (army.troops ?? []).filter(
    (item) => item.quantity > 0
  );

  const siege = army.siegeMachine;

  if (troops.length > 0) {
    const normalTroops = troops.filter(
      (item) => !isSiegeMachine(item.name)
    );

    if (normalTroops.length > 0) {
      const encoded = encodeItems(
        normalTroops,
        UNIT_IDS
      );

      if (encoded) {
        parts.push(`u${encoded}`);
      }
    }

    if (siege && siege.name) {
      const siegeId = UNIT_IDS[siege.name];

      if (siegeId !== undefined) {
        parts.push(
          `u${siege.quantity ?? 1}x${siegeId}`
        );
      }
    }
  } else if (siege?.name) {
    const siegeId = UNIT_IDS[siege.name];

    if (siegeId !== undefined) {
      parts.push(
        `u${siege.quantity ?? 1}x${siegeId}`
      );
    }
  }

  const spells = encodeItems(
    army.spells ?? [],
    SPELL_IDS
  );

  if (spells) {
    parts.push(`s${spells}`);
  }

  const heroes = (army.heroes ?? [])
    .filter(
      (hero) => HERO_IDS[hero.name] !== undefined
    )
    .slice(0, 4)
    .map(
      (hero) =>
        HERO_IDS[hero.name]
    )
    .join("-");

  if (heroes) {
    parts.push(`h${heroes}`);
  }

  const ccTroops = encodeItems(
    army.clanCastleTroops ?? [],
    UNIT_IDS
  );

  if (ccTroops) {
    parts.push(`i${ccTroops}`);
  }

  const ccSpells = encodeItems(
    army.clanCastleSpells ?? [],
    SPELL_IDS
  );

  if (ccSpells) {
    parts.push(`d${ccSpells}`);
  }

  return `https://link.clashofclans.com/en?action=CopyArmy&army=${parts.join("")}`;
}

function isSiegeMachine(
  name: string
): boolean {
  return [
    "Wall Wrecker",
    "Battle Blimp",
    "Stone Slammer",
    "Siege Barracks",
    "Log Launcher",
    "Flame Flinger",
    "Battle Drill",
    "Troop Launcher",
    "Sky Wagon",
  ].includes(name);
}
