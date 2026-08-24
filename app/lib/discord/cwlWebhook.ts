import { readFile } from "fs/promises";
import path from "path";

const WEBHOOK_URL =
  process.env.DISCORD_CWL_WEBHOOK_URL;

export async function sendCwlFinalizedWebhook() {
  if (!WEBHOOK_URL) {
    console.warn(
      "DISCORD_CWL_WEBHOOK_URL ontbreekt. CWL Discord-melding overgeslagen."
    );

    return {
      sent: false,
      reason: "WEBHOOK_NOT_CONFIGURED",
    };
  }

  const imagePath = path.join(
    process.cwd(),
    "public",
    "images",
    "discord",
    "discord-cwl.png"
  );

  const image = await readFile(imagePath);

  const form = new FormData();

  form.append(
    "files[0]",
    new Blob([image], {
      type: "image/png",
    }),
    "discord-cwl.png"
  );

  const response = await fetch(
    WEBHOOK_URL,
    {
      method: "POST",
      body: form,
    }
  );

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Discord webhook mislukt (${response.status}): ${body}`
    );
  }

  return {
    sent: true,
  };
}
