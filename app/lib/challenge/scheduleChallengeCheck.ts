import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const TIMER_UNIT = "phoenix-challenge-scheduled";
const CHALLENGE_SERVICE = "phoenix-challenge.service";
const SAFETY_MARGIN_SECONDS = 60;

export async function scheduleChallengeCheck(
  endsAt: Date,
): Promise<void> {
  /*
   * De scheduler is uitsluitend bedoeld voor de production
   * systemd-server. Tijdens lokale development niets uitvoeren.
   */
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  /*
   * Laat de controle één minuut na endsAt plaatsvinden.
   *
   * Bijvoorbeeld:
   * startsAt = 16-09 00:12
   * endsAt   = 23-09 00:12
   * controle = 23-09 00:13
   */
  const delayMs =
    endsAt.getTime() -
    Date.now() +
    SAFETY_MARGIN_SECONDS * 1000;

  /*
   * Nooit een negatieve of extreem korte timer maken.
   */
  const delaySeconds = Math.max(
    SAFETY_MARGIN_SECONDS,
    Math.ceil(delayMs / 1000),
  );

  /*
   * Een vorige geplande timer mag niet blijven bestaan.
   *
   * Dit is belangrijk bij:
   * - handmatige reset
   * - automatische challenge-start
   * - opnieuw plannen na reboot
   */
  for (const unit of [
    `${TIMER_UNIT}.timer`,
    `${TIMER_UNIT}.service`,
  ]) {
    try {
      await execFileAsync(
        "/usr/bin/systemctl",
        ["stop", unit],
      );
    } catch {
      /*
       * Unit bestaat mogelijk nog niet.
       * Dat is prima.
       */
    }
  }

  /*
   * Maak een nieuwe transient systemd timer.
   *
   * Deze timer start uiteindelijk de bestaande
   * phoenix-challenge.service.
   *
   * AccuracySec=1s voorkomt dat systemd zelf nog een grote
   * extra onnauwkeurigheidsmarge toevoegt.
   */
  await execFileAsync(
    "/usr/bin/systemd-run",
    [
      `--unit=${TIMER_UNIT}`,
      `--on-active=${delaySeconds}s`,
      "--timer-property=AccuracySec=1s",
      "--timer-property=Persistent=true",
      "--collect",
      "/usr/bin/systemctl",
      "start",
      CHALLENGE_SERVICE,
    ],
  );
}
