"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/app/lib/prisma";

export async function createBase(formData: FormData) {
  await prisma.base.create({
    data: {
      townHall: Number(formData.get("townHall")),
      category: String(formData.get("category")),
      name: String(formData.get("name")),
      description: String(formData.get("description") || ""),
      baseLink: String(formData.get("baseLink")),
      createdBy: String(formData.get("createdBy")),
    },
  });

  revalidatePath("/clan");
}