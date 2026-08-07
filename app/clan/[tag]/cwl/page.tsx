import { prisma } from "@/app/lib/prisma";
import { PHOENIX } from "@/app/lib/config";

type Props = {
  params: Promise<{
    tag: string;
  }>;
};

export default async function CWLPage({ params }: Props) {
  const { tag } = await params;
  const clan = PHOENIX.clans.find(
  (c) => c.tag === tag
);

  const wars = await prisma.war.findMany({
  where: {
    clan: {
      tag: tag,
  },
},
  orderBy: [
    { season: { season: "desc" } },
    { round: "asc" },
  ],
  include: {
    season: true,
    clan: true,
  },
});

  return (
    <main className="max-w-6xl mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">
        CWL History
      </h1>

      <p className="mb-6 text-xl font-semibold text-yellow-400">
        🏰 {clan?.name ?? tag}
      </p>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left p-3">Season</th>
            <th className="text-left p-3">Round</th>
            <th className="text-left p-3">Stars</th>
            <th className="text-left p-3">Enemy</th>
            <th className="text-left p-3">Destruction</th>
          </tr>
        </thead>

        <tbody>
          {wars.map((war) => (
            <tr
              key={war.warTag}
              className="border-b hover:bg-white/5"
            >
              <td className="p-3">{war.season.season}</td>

              <td className="p-3">{war.round}</td>

              <td className="p-3">
                {war.clanStars} - {war.opponentStars}
              </td>

              <td className="p-3">
                {war.clanStars > war.opponentStars
 		  ? "✅ Win"
 		  : war.clanStars < war.opponentStars
  		  ? "❌ Loss"
 		  : war.clanDestruction > war.opponentDestruction
 		  ? "✅ Win"
 	 	  : war.clanDestruction < war.opponentDestruction
 		  ? "❌ Loss"
		  : "🤝 Draw"}
              </td>

              <td className="p-3">
                {war.clanDestruction.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}