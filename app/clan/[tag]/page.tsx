export default async function ClanPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-8">
      <h1 className="text-4xl font-bold text-yellow-400">
        Clan: #{tag}
      </h1>

      <p className="mt-4 text-neutral-400">
        Hier komt straks alle informatie van de clan te staan.
      </p>
    </main>
  );
}