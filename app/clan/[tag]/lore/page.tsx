import Image from "next/image";

type LorePageProps = {
  params: Promise<{
    tag: string;
  }>;
};

const strips = Array.from(
  { length: 19 },
  (_, index) => index + 1
);

export default async function LorePage({
  params,
}: LorePageProps) {
  await params;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-6xl px-3 py-8 sm:px-6 sm:py-12">
        <header className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-300">
            🔥 The Dutch Giant
          </p>

          <h1 className="mt-3 text-3xl font-black sm:text-5xl">
            Phoenix Lore
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-white/55 sm:text-base">
            The story of the Phoenix that guards the history of
            The Dutch Giant.
          </p>
        </header>

        <section className="mx-auto flex max-w-5xl flex-col items-center gap-6">
          {strips.map((strip) => (
            <figure
              key={strip}
              className="w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] shadow-2xl"
            >
              <Image
                src={`/images/comic/strip${strip}.png`}
                alt={`Phoenix Lore strip ${strip}`}
                width={1600}
                height={1600}
                sizes="(max-width: 768px) 100vw, 1024px"
                className="h-auto w-full"
                priority={strip === 1}
              />
            </figure>
          ))}
        </section>

        <footer className="mt-12 text-center text-xs uppercase tracking-[0.2em] text-white/25">
          🔥 The Phoenix remembers.
        </footer>
      </div>
    </main>
  );
}
