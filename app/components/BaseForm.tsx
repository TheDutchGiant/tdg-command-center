"use client";

import { createBase } from "@/app/actions/baseActions";

export default function BaseForm() {
  return (
    <form
      action={createBase}
      className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900 p-6"
    >
      <div className="mb-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-400/60">
          🏰 TDG Base van de Week
        </p>

        <h2 className="mt-1 text-2xl font-bold text-yellow-400">
          Nieuwe TH18 Base
        </h2>

        <p className="mt-2 text-sm text-neutral-400">
          Gebruik een TH18-base van ClashKing.
          Phoenix maakt deze automatisch 7 dagen actief.
        </p>
      </div>

      <div className="grid gap-4">
        <input
          type="hidden"
          name="townHall"
          value="18"
        />

        <input
          name="name"
          className="rounded-lg bg-neutral-800 p-3"
          placeholder="Naam van de base"
          required
        />

        <input
          name="baseLink"
          className="rounded-lg bg-neutral-800 p-3"
          placeholder="Clash of Clans base-link"
          type="url"
          required
        />

        <input
          name="imageUrl"
          className="rounded-lg bg-neutral-800 p-3"
          placeholder="URL van de base-afbeelding"
          type="url"
          required
        />

        <input
          name="createdBy"
          className="rounded-lg bg-neutral-800 p-3"
          placeholder="Toegevoegd door"
          required
        />

        <button
          type="submit"
          className="rounded-lg bg-yellow-500 py-3 font-bold text-black transition hover:bg-yellow-400"
        >
          🏰 Base van de Week activeren
        </button>
      </div>
    </form>
  );
}
