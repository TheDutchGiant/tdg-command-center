import MemberGrid from "@/app/components/MemberGrid";
import StatusCard from "@/app/components/StatusCard";
import CwlCountdown from "@/app/components/CwlCountdown";
import getClan from "@/app/lib/getClan";
import { fetchClash } from "@/app/lib/clash";
import { prisma } from "@/app/lib/prisma";

export default async function ClanPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;

  const clan = await getClan(tag);

  let currentWar = null;

  try {
    currentWar = await fetchClash(
      `/clans/%23${tag.replace("#", "")}/currentwar`
    );
  } catch {
    currentWar = null;
  }

  const now = new Date();

  const availableBases =
    await prisma.base.count();

  const apiOnline = true;

  const warValue =
    currentWar?.state === "inWar"
      ? `${currentWar.opponent?.name ?? "Tegenstander"} · ${currentWar.clan?.stars ?? 0} ⭐ - ⭐ ${currentWar.opponent?.stars ?? 0}`
      : currentWar?.state === "preparation"
        ? "War begint binnenkort"
        : "Geen actieve oorlog";

  return (
    <>
      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-bold">
          🏠 Dashboard
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
          <StatusCard
            icon="🟢"
            title="API Status"
            value={
              apiOnline
                ? "Online"
                : "Offline"
            }
            detail="Clash API bereikbaar"
          />

          <StatusCard
            icon="⚔️"
            title="War"
            value={warValue}
          />

          <StatusCard
            icon="🏆"
            title="CWL"
            value={
              <CwlCountdown />
            }
            detail="Tot de volgende CWL"
          />

          <StatusCard
            icon="🏰"
            title="Bases"
            value={`${availableBases} beschikbaar`}
            detail="Wekelijkse refresh"
          />

          <StatusCard
            icon="🤖"
            title="Phoenix Intelligence"
            value="Actief"
            detail="CWL Intelligence operationeel"
          />

          <StatusCard
            icon="📅"
            title="Events"
            value="Event Hub"
            detail="Actuele events niet beschikbaar via de officiële API"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold">
          👥 Laatste leden
        </h2>

        <MemberGrid members={clan.memberList} clanTag={tag} />
      </section>
    </>
  );
}
