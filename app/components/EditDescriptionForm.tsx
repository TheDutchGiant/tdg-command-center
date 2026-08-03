"use client";

import { useState, useTransition } from "react";
import { updateDescription } from "@/app/actions/baseActions";

type EditDescriptionFormProps = {
  id: number;
  description: string;
};

export default function EditDescriptionForm({
  id,
  description,
}: EditDescriptionFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(description);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      await updateDescription(id, text);
      setIsEditing(false);
    });
  };

  if (!isEditing) {
    return (
      <div className="mt-4">
        <button
          onClick={() => setIsEditing(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white transition hover:bg-blue-500"
        >
          ✏️ Omschrijving aanpassen
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        className="w-full rounded-lg border border-neutral-700 bg-neutral-900 p-3 text-white"
      />

      <div className="flex gap-3">
        <button
          onClick={save}
          disabled={isPending}
          className="rounded-lg bg-green-600 px-4 py-2 font-bold text-white transition hover:bg-green-500 disabled:opacity-50"
        >
          {isPending ? "Opslaan..." : "💾 Opslaan"}
        </button>

        <button
          onClick={() => {
            setText(description);
            setIsEditing(false);
          }}
          className="rounded-lg bg-neutral-700 px-4 py-2 font-bold text-white transition hover:bg-neutral-600"
        >
          Annuleren
        </button>
      </div>
    </div>
  );
}