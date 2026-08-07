import ClanHero from "@/app/components/ClanHero";
import ClanNavigation from "@/app/components/ClanNavigation";
import ScrollToTop from "@/app/components/ScrollToTop";
import ClanHud from "@/app/components/ClanHud";

export default async function ClanLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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
        <h1 className="text-2xl font-bold">
          Clan niet gevonden.
        </h1>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <ScrollToTop />

      <div className="relative mx-auto max-w-7xl p-8">
        <ClanHero clan={clan} />

        <ClanNavigation tag={tag} />

        {children}
      </div>
</main>
  );
}