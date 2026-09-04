"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ClanSwitcher from "@/app/components/ClanSwitcher";

type ClanNavigationProps = {
  tag: string;
};

const menuItems = [
  {
    name: "🏠 Dashboard",
    href: "",
  },
  {
    name: "👥 Leden",
    href: "members",
  },
  {
    name: "🏆 CWL",
    href: "cwl",
  },
  {
    name: "⚔️ Wars",
    href: "wars",
  },
  {
    name: "🏰 Bases",
    href: "bases",
  },
  {
    name: "📊 Statistieken",
    href: "stats",
  },
  {
    name: "🔥 Lore",
    href: "lore",
  },
  {
    name: "⚙️ Instellingen",
    href: "settings",
  },
];

export default function ClanNavigation({
  tag,
}: ClanNavigationProps) {
  const pathname = usePathname();

  return (
    <nav className="relative mb-8 mt-6 rounded-xl border border-neutral-800 bg-neutral-900/95 backdrop-blur md:sticky md:top-0 md:z-50">
      <div className="flex flex-wrap items-center justify-between gap-3 p-3">

        <div className="flex items-center">
          <ClanSwitcher currentTag={tag} />

          <Link
            href="/"
            className="rounded-lg px-2 py-2 text-sm font-semibold text-neutral-300 transition hover:bg-neutral-800 hover:text-yellow-400"
          >
            ⬅ Back to Legacy Hall
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {menuItems.map((item) => {
            const href =
              item.href === ""
                ? `/clan/${tag}`
                : `/clan/${tag}/${item.href}`;

            const active = pathname === href;

            return (
              <Link
                key={item.name}
                href={href}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-yellow-500 text-black"
                    : "text-neutral-300 hover:bg-neutral-800 hover:text-yellow-400"
                }`}
              >
                {item.name}
              </Link>
            );
          })}

          {tag === "2JLLPVGUU" && (
            <Link
              href="/challenge"
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                pathname === "/challenge"
                  ? "bg-emerald-500 text-black"
                  : "text-neutral-300 hover:bg-neutral-800 hover:text-emerald-300"
              }`}
            >
              🎲 Challenge
            </Link>
          )}
        </div>

        <Link
          href="/admin"
          className="rounded-lg border border-orange-500/30 px-3 py-2 text-sm font-semibold text-orange-300 transition hover:bg-orange-500/10 hover:text-orange-200"
        >
          🔐 Admin
        </Link>
      </div>
    </nav>
  );
}