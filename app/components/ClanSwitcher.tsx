"use client";

import { useState } from "react";
import Link from "next/link";
import { PHOENIX } from "@/app/lib/config";

type ClanSwitcherProps = {
  currentTag: string;
};

export default function ClanSwitcher({
  currentTag,
}: ClanSwitcherProps) {
  const [open, setOpen] = useState(false);

  const currentClan = PHOENIX.clans.find(
    (clan) => clan.tag === currentTag
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Wissel van clan"
        className="rounded-lg px-2 py-2 text-sm text-neutral-400 transition hover:bg-neutral-800 hover:text-yellow-400"
      >
        ▾
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 min-w-44 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 shadow-xl">
          {PHOENIX.clans.map((clan) => {
            const active = clan.tag === currentTag;

            return (
              <Link
                key={clan.tag}
                href={`/clan/${clan.tag}`}
                onClick={() => setOpen(false)}
                className={`block px-4 py-2 text-sm transition ${
                  active
                    ? "bg-neutral-800 text-yellow-400"
                    : "text-neutral-300 hover:bg-neutral-800 hover:text-yellow-400"
                }`}
              >
                {clan.name}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}