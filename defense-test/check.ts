import { fetchClash } from "@/app/lib/clash";

async function main() {
  const warTag = "#8GRCVY8LQ";

  console.log("\n========================================");
  console.log(" HISTORISCHE CWL WAR - API INSPECTIE");
  console.log("========================================\n");

  console.log(`War: ${warTag}`);
  console.log("API ophalen...\n");

  const war = await fetchClash(
    `/clanwarleagues/wars/%23${warTag.replace("#", "")}`
  );

  console.log("STATE:", war.state);
  console.log("TEAM SIZE:", war.teamSize);

  console.log("\n========================================");
  console.log(" CLAN");
  console.log("========================================\n");

  console.log(
    JSON.stringify(
      {
        tag: war.clan?.tag,
        name: war.clan?.name,
        members: war.clan?.members?.length,
      },
      null,
      2
    )
  );

  console.log("\n========================================");
  console.log(" EERSTE 5 MEMBERS VAN ONZE CLAN");
  console.log("========================================\n");

  for (
    const member of
    (war.clan?.members ?? []).slice(0, 5)
  ) {
    console.log(
      JSON.stringify(
        member,
        null,
        2
      )
    );
  }

  console.log("\n========================================");
  console.log(" ALLEEN POSITIE-GEGEVENS");
  console.log("========================================\n");

  for (
    const member of
    war.clan?.members ?? []
  ) {
    console.log(
      `${member.tag} | ${member.name} | mapPosition=${member.mapPosition} | TH${member.townhallLevel}`
    );
  }

  console.log("\n========================================");
  console.log(" KLAAR");
  console.log("========================================\n");
}

main()
  .catch((error) => {
    console.error("\n🔥 FOUT:");
    console.error(error);
    process.exit(1);
  });