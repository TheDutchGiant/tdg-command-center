import MemberGrid from "@/app/components/MemberGrid";
import StatusCard from "@/app/components/StatusCard";

export default async function ClanPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;

  const res = await fetch(`http://localhost:3000/api/clan/${tag}`, {
    cache: "no-store",
  });

  const clan = await res.json();

  if (clan.error) {
    return (
      <section className="flex items-center justify-center py-20">
        <h1 className="text-2xl font-bold">
          Clan niet gevonden.
        </h1>
      </section>
    );
  }

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