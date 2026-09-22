import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Mapping = {
  discordId: string;
  discordName: string;
  tags: string[];
};

const mappings: Mapping[] = [
  {
    discordId: "1315368461874237490",
    discordName: "Baba Yaga",
    tags: ["#LCYCGQYLU", "#GV0PR8YYQ", "#CCGV8VJP"],
  },
  {
    discordId: "1223589610756771981",
    discordName: "Blessed",
    tags: ["#9G8J9U2P", "#LLQ08JU80", "#2QQ2JV8V2"],
  },
  {
    discordId: "218789810368675841",
    discordName: "cheesy",
    tags: ["#GCY02UL90", "#20YLQQQUG"],
  },
  {
    discordId: "438763551054888980",
    discordName: "chief Bane",
    tags: ["#P0YVRPY8", "#89RQRLJVJ", "#8CVVQJQ0"],
  },
  {
    discordId: "1548594327494594635",
    discordName: "Depee",
    tags: ["#LQPLPL0V9"],
  },
  {
    discordId: "1007742029658325142",
    discordName: "dustin",
    tags: ["#2GRCY0R9Q", "#L0C92G9CY"],
  },
  {
    discordId: "471298037788966922",
    discordName: "Guus T",
    tags: ["#2RRPCVUCQ", "#22J2YLC2U"],
  },
  {
    discordId: "385877114186104832",
    discordName: "Hans_Bonnechance",
    tags: ["#898QVQC8"],
  },
  {
    discordId: "1541031252201701489",
    discordName: "Jerry",
    tags: ["#URJUYPC2"],
  },
  {
    discordId: "665155514208092170",
    discordName: "jordi",
    tags: ["#8QY8Y9P2Q"],
  },
  {
    discordId: "1249748553333739561",
    discordName: "Julian",
    tags: ["#8RR9UVPQ"],
  },
  {
    discordId: "1532750981169942558",
    discordName: "Kreutel",
    tags: ["#9Q2P29CQ"],
  },
  {
    discordId: "251108018857574400",
    discordName: "Kriff",
    tags: ["#GVY08G0GG", "#GUJ92PJJV"],
  },
  {
    discordId: "903337368646471742",
    discordName: "LucaTheCactus",
    tags: ["#Q80LLC9P9", "#GPURGCLL8", "#GPU9RP08C", "#QUGV8GQRP"],
  },
  {
    discordId: "1475455842303213641",
    discordName: "Marfman",
    tags: ["#R0R90CPQ8", "#8292VURCP", "#PUPPG9PP"],
  },
  {
    discordId: "1462784131187609662",
    discordName: "Marijke",
    tags: [
      "#GVVR99RGY",
      "#LCJYVQ8YC",
      "#R0QVUCVG9",
      "#GG2V0VVQJ",
      "#R2GG2PL8Q",
      "#GYUVCJU2L",
    ],
  },
  {
    discordId: "725461916289466451",
    discordName: "Mukit/Martia/Yuya",
    tags: ["#LR09CC0C8", "#PUR0PVG2J", "#2YGRYCUL"],
  },
  {
    discordId: "1183499916392280147",
    discordName: "Patrick",
    tags: ["#GYG8GY28"],
  },
  {
    discordId: "321365096167112704",
    discordName: "PooManBoo",
    tags: ["#PCQLCG0L2"],
  },
  {
    discordId: "399593250593479764",
    discordName: "RACKS 🫥",
    tags: [
      "#Y2LYQ28PU",
      "#80RVPLR9L",
      "#P9P8YUJQV",
      "#89Q0R2PV0",
      "#P2RVCCC0Y",
    ],
  },
  {
    discordId: "300698510628618241",
    discordName: "Simon.",
    tags: ["#92C8RG9CP"],
  },
  {
    discordId: "363808732041314324",
    discordName: "Snellage",
    tags: ["#G9JGCLRP"],
  },
  {
    discordId: "1452634167937470476",
    discordName: "Stan",
    tags: ["#G2VCV2LJ9", "#Y8Q2GP09Y"],
  },
  {
    discordId: "1328710718488318006",
    discordName: "Strijder",
    tags: ["#GVCYCPJYV", "#GV9LPCUPY", "#LPG20Y9QC"],
  },
  {
    discordId: "1327929079810228226",
    discordName: "TDG Maarten 🏓",
    tags: ["#GUVG809QV", "#QR8PUGP0Y", "#G8GCCR0U", "#R2PU9JL92"],
  },
  {
    discordId: "714216513837596712",
    discordName: "The killer",
    tags: ["#9LCCGU89C", "#8LCRY0JCU"],
  },
  {
    discordId: "412621096786067469",
    discordName: "Ties",
    tags: ["#80RUVP0V0"],
  },
  {
    discordId: "1536691194141347920",
    discordName: "WhoHoFace",
    tags: ["#8Q9VPP80Q"],
  },
  {
    discordId: "290951198087839744",
    discordName: "Wout",
    tags: ["#U0QR98UQ"],
  },
  {
    discordId: "640803188634681374",
    discordName: "VDL",
    tags: ["#8GRCYG0Y8"],
  },
];

const normalizeTag = (tag: string) =>
  tag.trim().toUpperCase().replace(/^#/, "");

async function main() {
  console.log("🔎 TDG Discord-links DRY-RUN");
  console.log("================================\n");

  let errors = 0;
  let existing = 0;
  let ready = 0;

  const seenTags = new Map<string, string>();

  for (const mapping of mappings) {
    console.log(`👤 ${mapping.discordName} (${mapping.discordId})`);

    for (const rawTag of mapping.tags) {
      const tag = `#${normalizeTag(rawTag)}`;

      const previous = seenTags.get(tag);
      if (previous && previous !== mapping.discordName) {
        console.log(`   ❌ CONFLICT: ${tag} staat ook bij ${previous}`);
        errors++;
        continue;
      }

      seenTags.set(tag, mapping.discordName);

      const player = await prisma.player.findUnique({
        where: { playerTag: tag },
        select: { playerTag: true, currentName: true },
      });

      if (!player) {
        console.log(`   ⚠️ ${tag} — Player bestaat nog niet in Phoenix`);
        continue;
      }

      const link = await prisma.discordAccountLink.findUnique({
        where: { playerTag: tag },
        select: {
          discordUserId: true,
          discordDisplayName: true,
        },
      });

      if (link) {
        if (link.discordUserId === mapping.discordId) {
          console.log(
            `   ✅ ${tag} — al correct gekoppeld (${player.currentName ?? "naam onbekend"})`,
          );
          existing++;
        } else {
          console.log(
            `   ❌ ${tag} — BESTAANDE KOPPELING naar ${link.discordDisplayName ?? link.discordUserId}`,
          );
          errors++;
        }
      } else {
        console.log(
          `   🟢 ${tag} — klaar voor koppeling (${player.currentName ?? "naam onbekend"})`,
        );
        ready++;
      }
    }

    console.log("");
  }

  console.log("================================");
  console.log(`🟢 Nieuwe koppelingen: ${ready}`);
  console.log(`✅ Al correct gekoppeld: ${existing}`);
  console.log(`❌ Fouten/conflicten: ${errors}`);
  console.log("================================");

  if (errors > 0) {
    console.log("⛔ DRY-RUN NIET GROEN — niets uitvoeren.");
    process.exitCode = 1;
  } else {
    console.log("🟢 DRY-RUN GROEN — er is niets gewijzigd.");
  }
}

main()
  .catch((err) => {
    console.error("💥 DRY-RUN fout:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
