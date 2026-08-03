"use client";

import { useTransition } from "react";
import { deleteBase } from "@/app/actions/baseActions";

type DeleteBaseButtonProps = {
  id: number;
};

export default function DeleteBaseButton({
  id,
}: DeleteBaseButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          const confirmed = window.confirm(
            "Weet je zeker dat je deze base wilt verwijderen?"
          );

          if (!confirmed) return;

          await deleteBase(id);
        })
      }
      disabled={isPending}
      className="rounded-lg bg-red-600 px-4 py-2 font-bold text-white transition hover:bg-red-500 disabled:opacity-50"
    >
      {isPending ? "Verwijderen..." : "🗑️ Verwijderen"}
    </button>
  );
}