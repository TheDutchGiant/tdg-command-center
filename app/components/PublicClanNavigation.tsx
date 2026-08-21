"use client";

import { useState } from "react";
import Link from "next/link";
import { PHOENIX } from "@/app/lib/config";

export default function PublicClanNavigation() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="mb-6 rounded-xl border border-neutral-800 bg-neutral-900/95 backdrop-blur">
      <div className="flex items-center gap-1 p-3">

        <div className="relative">
          <button
            type="button"
            onClick={() =>
              setOpen((value) => !value)
            }
            aria-expanded={open}
            aria-label="Wissel van clan"
            className="rounded-lg px-2 py-2 text-sm text-neutral-400 transition hover:bg-neutral-800 hover:text-yellow-400"
          >
            ▾
          </button>

          {open && (
            <div className="absolute left-0 top-full z-50 mt-2 min-w-44 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 shadow-xl">
              {PHOENIX.clans.map((clan) => (
                <Link
                  key={clan.tag}
                  href={`/clan/${clan.tag}`}
                  onClick={() =>
                    setOpen(false)
                  }
                  className="block px-4 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800 hover:text-yellow-400"
                >
                  {clan.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        <Link
          href="/"
          className="rounded-lg px-2 py-2 text-sm font-semibold text-neutral-300 transition hover:bg-neutral-800 hover:text-yellow-400"
        >
          ⬅ Back to Legacy Hall
        </Link>

      </div>
    </nav>
  );
}
