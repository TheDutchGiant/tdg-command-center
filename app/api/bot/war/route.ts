import { NextResponse } from "next/server";
import { fetchClash } from "@/app/lib/clash";

function normalizeTag(tag: string) {
  return tag.replace(/^#/, "").toUpperCase();
}

function summarizeRoster(
  members: Array<{
    townhallLevel?: number;
  }>,
) {
  const counts = new Map<number, number>();

  for (const member of members) {
    const townHall = Number(
      member.townhallLevel ?? 0,
    );

    if (!townHall) {
      continue;
    }

    counts.set(
      townHall,
      (counts.get(townHall) ?? 0) + 1,
    );
  }

  return [...counts.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([townHall, count]) => ({
      townHall,
      count,
    }));
}

function transformMembers(
  members: Array<{
    tag?: string;
    name?: string;
    mapPosition?: number;
    townhallLevel?: number;
    attacks?: Array<{
      order?: number;
      defenderTag?: string;
      stars?: number;
      destructionPercentage?: number;
    }>;
  }>,
) {
  return members.map((member) => ({
    tag: normalizeTag(member.tag ?? ""),
    name: member.name ?? "",
    mapPosition: Number(
      member.mapPosition ?? 0,
    ),
    townHall: Number(
      member.townhallLevel ?? 0,
    ),
    attacks: (member.attacks ?? []).map(
      (attack) => ({
        order: Number(
          attack.order ?? 0,
        ),
        defenderTag: normalizeTag(
          attack.defenderTag ?? "",
        ),
        stars: Number(
          attack.stars ?? 0,
        ),
        destruction: Number(
          attack.destructionPercentage ?? 0,
        ),
      }),
    ),
  }));
}

export async function GET(request: Request) {
  const internalKey =
    request.headers.get("x-tdg-bot-key");

  if (
    !process.env.PHOENIX_BOT_API_KEY ||
    internalKey !==
      process.env.PHOENIX_BOT_API_KEY
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
      },
      { status: 401 },
    );
  }

  const url = new URL(request.url);

  const clanTag =
    url.searchParams.get("clanTag");

  if (!clanTag) {
    return NextResponse.json(
      {
        success: false,
        error: "clanTag ontbreekt.",
      },
      { status: 400 },
    );
  }

  const normalizedTag =
    normalizeTag(clanTag);

  try {
    const war = await fetchClash(
      `/clans/%23${encodeURIComponent(
        normalizedTag,
      )}/currentwar`,
    );

    if (
      !war ||
      war.state === "notInWar" ||
      !war.clan
    ) {
      return NextResponse.json({
        success: true,
        war: null,
      });
    }

    const ownMembers =
      transformMembers(
        war.clan.members ?? [],
      );

    const opponentMembers =
      transformMembers(
        war.opponent?.members ?? [],
      );

    const ownByTag = new Map(
      ownMembers.map((member) => [
        member.tag,
        member,
      ]),
    );

    const opponentByTag = new Map(
      opponentMembers.map((member) => [
        member.tag,
        member,
      ]),
    );

    /*
     * Onze aanvallen:
     * eigen speler → tegenstander
     */
    const offence = ownMembers.flatMap(
      (member) =>
        member.attacks.map(
          (attack) => {
            const target =
              opponentByTag.get(
                attack.defenderTag,
              );

            return {
              side: "OFFENCE" as const,
              order: attack.order,
              attackerName:
                member.name,
              attackerPosition:
                member.mapPosition,
              attackerTownHall:
                member.townHall,
              defenderPosition:
                target?.mapPosition ?? 0,
              defenderTownHall:
                target?.townHall ?? 0,
              stars: attack.stars,
              destruction:
                attack.destruction,
            };
          },
        ),
    );

    /*
     * Verdedigingen:
     * tegenstander → eigen speler.
     *
     * We presenteren dit bewust vanuit
     * TDG-perspectief:
     * "TDG Maarten #1 wordt aangevallen
     *  door #12"
     */
    const defence = opponentMembers.flatMap(
      (member) =>
        member.attacks.map(
          (attack) => {
            const target =
              ownByTag.get(
                attack.defenderTag,
              );

            return {
              side: "DEFENCE" as const,
              order: attack.order,
              defenderName:
                target?.name ?? "",
              defenderPosition:
                target?.mapPosition ?? 0,
              defenderTownHall:
                target?.townHall ?? 0,
              attackerPosition:
                member.mapPosition,
              attackerTownHall:
                member.townHall,
              stars: attack.stars,
              destruction:
                attack.destruction,
            };
          },
        ),
    );

    const recentOffence =
      [...offence]
        .sort(
          (a, b) =>
            b.order - a.order,
        )
        .slice(0, 5);

    const recentDefence =
      [...defence]
        .sort(
          (a, b) =>
            b.order - a.order,
        )
        .slice(0, 5);

    return NextResponse.json({
      success: true,
      war: {
        state: war.state,
        teamSize:
          Number(war.teamSize ?? 0),
        startTime:
          war.startTime ?? null,
        endTime:
          war.endTime ?? null,

        clan: {
          tag: normalizeTag(
            war.clan?.tag ?? normalizedTag,
          ),
          name:
            war.clan?.name ?? "",
          stars:
            Number(
              war.clan?.stars ?? 0,
            ),
          destruction:
            Number(
              war.clan
                ?.destructionPercentage ??
                0,
            ),
          roster:
            summarizeRoster(
              war.clan?.members ?? [],
            ),
          members:
            ownMembers,
        },

        opponent: {
          tag: normalizeTag(
            war.opponent?.tag ?? "",
          ),
          name:
            war.opponent?.name ?? "",
          stars:
            Number(
              war.opponent?.stars ?? 0,
            ),
          destruction:
            Number(
              war.opponent
                ?.destructionPercentage ??
                0,
            ),
          roster:
            summarizeRoster(
              war.opponent?.members ??
                [],
            ),
          members:
            opponentMembers,
        },

        recentOffence,
        recentDefence,
      },
    });
  } catch (error) {
    console.error(
      "❌ Bot war API fout:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Onbekende fout.",
      },
      { status: 500 },
    );
  }
}
