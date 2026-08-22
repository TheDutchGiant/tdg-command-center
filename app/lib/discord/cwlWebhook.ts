const WEBHOOK_URL =
  process.env.DISCORD_CWL_WEBHOOK_URL;

type CwlWebhookClan = {
  name: string;
  format: "V15" | "V30";
  players: number;
};

export async function sendCwlFinalizedWebhook(
  season: string,
  clans: CwlWebhookClan[]
) {
  if (!WEBHOOK_URL) {
    console.warn(
      "DISCORD_CWL_WEBHOOK_URL ontbreekt. CWL Discord-melding overgeslagen."
    );

    return {
      sent: false,
      reason: "WEBHOOK_NOT_CONFIGURED",
    };
  }

  const clanLines = clans
    .map(
      (clan) =>
        `• **${clan.name}** — ${clan.format === "V30" ? "30v30" : "15v15"} — ${clan.players} spelers`
    )
    .join("\n");

  const response = await fetch(
    WEBHOOK_URL,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        username: "TDG Phoenix",
        embeds: [
          {
            title:
              "🏆 CWL-indeling definitief",
            description:
              `De definitieve CWL-indeling voor **${season}** staat nu op de website.\n\n${clanLines}`,
            color: 0xf59e0b,
            footer: {
              text:
                "TDG Phoenix • The Dutch Giant Family",
            },
            timestamp:
              new Date().toISOString(),
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const body =
      await response.text();

    throw new Error(
      `Discord webhook mislukt (${response.status}): ${body}`
    );
  }

  return {
    sent: true,
  };
}
