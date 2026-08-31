"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/app/lib/prisma";

export async function createBase(formData: FormData) {
  const townHall = Number(
    formData.get("townHall"),
  );

  const name =
    String(
      formData.get("name") ?? "",
    ).trim();

  const baseLink =
    String(
      formData.get("baseLink") ?? "",
    ).trim();

  const imageUrl =
    String(
      formData.get("imageUrl") ?? "",
    ).trim();

  const createdBy =
    String(
      formData.get("createdBy") ?? "",
    ).trim();

  if (
    townHall !== 18
  ) {
    throw new Error(
      "De Base van de Week ondersteunt momenteel alleen TH18.",
    );
  }

  if (
    !name ||
    !baseLink ||
    !imageUrl ||
    !createdBy
  ) {
    throw new Error(
      "Naam, Clash-link, afbeelding en naam van de invoerder zijn verplicht.",
    );
  }

  const now =
    new Date();

  const expiresAt =
    new Date(
      now.getTime() +
        7 *
          24 *
          60 *
          60 *
          1000,
    );

  await prisma.$transaction([
    prisma.base.updateMany({
      where: {
        townHall: 18,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    }),

    prisma.base.create({
      data: {
        townHall: 18,
        category: "Challenge",
        name,
        description:
          "TDG Base van de Week · ClashKing",
        baseLink,
        imageUrl,
        createdBy,
        expiresAt,
        isActive: true,
      },
    }),
  ]);

  revalidatePath(
    "/clan/2JLLPVGUU/bases",
  );

  revalidatePath(
    "/bases/th18",
  );

  revalidatePath(
    "/challenge",
  );
}

export async function deleteBase(
  id: number,
) {
  await prisma.base.delete({
    where: {
      id,
    },
  });

  revalidatePath(
    "/clan/2JLLPVGUU/bases",
  );

  revalidatePath(
    "/bases/th18",
  );

  revalidatePath(
    "/challenge",
  );
}

export async function updateDescription(
  id: number,
  description: string,
) {
  await prisma.base.update({
    where: {
      id,
    },
    data: {
      description,
    },
  });

  revalidatePath(
    "/bases/th18",
  );
}
