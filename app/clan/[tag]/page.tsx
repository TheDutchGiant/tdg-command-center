import ClanHeader from "@/app/components/ClanHeader";

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
      <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <h1 className="text-2xl font-bold">Clan niet gevonden.</h1>
      </main>
    );
  }

  const roleInfo = (role: string) => {
    switch (role) {
      case "leader":
        return {
          label: "👑 Leader",
          color: "text-yellow-400",
        };

      case "coLeader":
        return {
          label: "⭐ Co-Leader",
          color: "text-violet-400",
        };

      case "admin":
        return {
          label: "🛡️ Elder",
          color: "text-sky-400",
        };

      default:
        return {
          label: "👤 Member",
          color: "text-neutral-400",
        };
    }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-7xl p-8">

        <ClanHeader clan={clan} />

        <h2 className="mt-8 mb-4 text-2xl font-bold">
          👥 Leden
        </h2>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {clan.memberList.map(
            (member: {
              tag: string;
              name: string;
              role: string;
              townHallLevel: number;
              trophies: number;
            }) => {
              const role = roleInfo(member.role);

              return (
                <div
                  key={member.tag}
                  className="rounded-xl bg-neutral-900 p-4 shadow hover:bg-neutral-800 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-base">
                      {member.name}
                    </div>

                    <div className="rounded bg-yellow-500 px-2 py-1 text-xs font-bold text-black">
                      TH{member.townHallLevel}
                    </div>
                  </div>

                  <div className={`mt-2 text-sm font-medium ${role.color}`}>
                    {role.label}
                  </div>

                  <div className="mt-2 text-sm">
                    🏆 {member.trophies}
                  </div>
                </div>
              );
            }
          )}
        </div>

      </div>
    </main>
  );
}