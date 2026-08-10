import { PHOENIX } from "@/app/lib/config";

export default function DiscordPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <section className="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950 shadow-2xl">
        <div className="px-6 py-8 text-center">
          <h1 className="text-3xl font-black tracking-tight text-white">
            💬 Join the Community
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-neutral-400">
            Welkom in de officiële Discord-community van The Dutch Giant.
            Hier houden we contact, plannen we wars en CWL en delen we bases,
            strategieën en natuurlijk een hoop gezelligheid. 🦅
          </p>
        </div>

        <a
          href={PHOENIX.discord.invite}
          target="_blank"
          rel="noopener noreferrer"
          className="group block"
          aria-label="Join The Dutch Giant Discord"
        >
          <img
            src="/images/discord/discord-banner.png"
            alt="Join The Dutch Giant Discord"
            className="block w-full transition duration-300 group-hover:scale-[1.01] group-hover:brightness-110"
          />
        </a>

        <div className="px-6 py-5 text-center">
          <p className="text-xs text-neutral-600">
            Klik op de afbeelding om onze Discord te openen.
          </p>
        </div>
      </section>
    </div>
  );
}