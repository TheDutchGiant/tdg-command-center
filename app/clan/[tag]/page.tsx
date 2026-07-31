export default async function ClanPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;

  const res = await fetch("http://localhost:3000/api/clan", {
    cache: "no-store",
  });

  const clans = await res.json();

  const clan = clans.find(
    (c: { tag: string }) => c.tag === `#${tag}`
  );

  if (!clan) {
    return <div>Clan niet gevonden.</div>;
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">{clan.name}</h1>
      <p className="text-gray-500">{clan.tag}</p>

      <div className="mt-6">
        <h2 className="text-xl font-semibold">
          Leden ({clan.memberList.length})
        </h2>

        <ul className="mt-4 space-y-2">
          {clan.memberList.map(
            (member: {
              tag: string;
              name: string;
              role: string;
              townHallLevel: number;
              trophies: number;
            }) => (
              <li
                key={member.tag}
                className="rounded border p-3"
              >
                <div className="font-semibold">{member.name}</div>
                <div>TH {member.townHallLevel}</div>
                <div>{member.role}</div>
                <div>🏆 {member.trophies}</div>
              </li>
            )
          )}
        </ul>
      </div>
    </main>
  );
}
