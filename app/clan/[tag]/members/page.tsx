import MemberGrid from "@/app/components/MemberGrid";

export default async function MembersPage({
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
    <section>
      <h1 className="mb-6 text-3xl font-bold">
        👥 Leden
      </h1>

      <MemberGrid members={clan.memberList} />
    </section>
  );
}