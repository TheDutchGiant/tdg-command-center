"use client";

import { useState } from "react";
import BaseForm from "./BaseForm";

export default function AddBaseButton() {
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowForm(!showForm)}
        className="rounded-lg bg-yellow-500 px-5 py-3 font-bold text-black transition hover:bg-yellow-400"
      >
        {showForm ? "❌ Sluiten" : "➕ Nieuwe Base toevoegen"}
      </button>

      {showForm && (
        <div className="mt-8">
          <BaseForm />
        </div>
      )}
    </>
  );
}