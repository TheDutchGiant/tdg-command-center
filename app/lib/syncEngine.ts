import { PHOENIX } from "./config";
import { checkForNewCWL } from "./checkForNewCWL";

export async function syncEngine() {
  console.log("🔥 Phoenix Sync Engine gestart");

  console.log(
    `Family: ${PHOENIX.clans.length} clans`
  );

  console.log(
    `Idle controle: iedere ${PHOENIX.sync.idleDays} dagen`
  );

  console.log(
    `Actieve CWL controle: iedere ${PHOENIX.sync.activeMinutes} minuten`
  );

  console.log(
    "Controleer of er een actieve CWL is..."
  );

  await checkForNewCWL();
}