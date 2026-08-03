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

export async function deleteBase(id: number) {
  await prisma.base.delete({
    where: {
      id,
    },
  });

  revalidatePath("/clan");
}

export async function updateDescription(
  id: number,
  description: string
) {
  await prisma.base.update({
    where: {
      id,
    },
    data: {
      description,
    },
  });

  revalidatePath("/clan");
}