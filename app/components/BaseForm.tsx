"use client";

import { createBase } from "@/app/actions/baseActions";

export default function BaseForm() {
  return (
    <form action={createBase} className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
      <h2 className="mb-6 text-2xl font-bold text-yellow-400">
        ➕ Nieuwe Base
      </h2>

      <div className="grid gap-4">

        <select
          name="townHall"
          className="rounded-lg bg-neutral-800 p-3"
          required
        >
          <option value="">Town Hall</option>
          <option value="18">TH18</option>
          <option value="17">TH17</option>
          <option value="16">TH16</option>
          <option value="15">TH15</option>
          <option value="14">TH14</option>
          <option value="13">TH13</option>
        </select>

        <select
          name="category"
          className="rounded-lg bg-neutral-800 p-3"
          required
        >
          <option value="">Categorie</option>
          <option value="CWL">CWL</option>
          <option value="War">War</option>
          <option value="Legends">Legends</option>
          <option value="Farming">Farming</option>
          <option value="Anti 3-Star">Anti 3-Star</option>
        </select>

        <input
          name="name"
          className="rounded-lg bg-neutral-800 p-3"
          placeholder="Naam van de base"
          required
        />

        <textarea
          name="description"
          className="rounded-lg bg-neutral-800 p-3"
          placeholder="Beschrijving"
          rows={4}
        />

        <input
          name="baseLink"
          className="rounded-lg bg-neutral-800 p-3"
          placeholder="https://link.clashofclans.com/..."
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
          💾 Base Opslaan
        </button>

      </div>
    </form>
  );
}