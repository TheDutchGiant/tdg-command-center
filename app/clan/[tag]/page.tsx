import MemberGrid from "@/app/components/MemberGrid";
import StatusCard from "@/app/components/StatusCard";
import getClan from "@/app/lib/getClan";

export default async function ClanPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;

  const clan = await getClan(tag);

  return (
    <>
      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-bold">
          🏠 Dashboard
        </h2>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <StatusCard
            icon="🟢"
            title="API Status"
            value="Online"
          />

          <StatusCard
            icon="⚔️"
            title="War"
            value="Binnenkort"
          />

          <StatusCard
            icon="🏆"
            title="CWL"
            value="Nog geen data"
          />

          <StatusCard
            icon="🏰"
            title="Bases"
            value="0 beschikbaar"
          />

          <StatusCard
            icon="🤖"
            title="Phoenix Intelligence"
            value="Wordt gebouwd..."
          />

          <StatusCard
            icon="📅"
            title="Events"
            value="Geen events"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold">
          👥 Laatste leden
        </h2>

        <MemberGrid members={clan.memberList} />
      </section>
    </>
  );
}