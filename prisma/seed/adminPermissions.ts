import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const permissions = [
  {
    key: "CW",
    name: "CW beheer",
    description:
      "Toegang tot CW-informatie en CW-beheer.",
  },
  {
    key: "CWL",
    name: "CWL beheer",
    description:
      "Toegang tot CWL-informatie en CWL-beheer.",
  },
  {
    key: "API",
    name: "API beheer",
    description:
      "Toegang tot API-status en synchronisaties.",
  },
  {
    key: "AUDIT",
    name: "Auditlog",
    description:
      "Toegang tot het bekijken en beheren van de auditlog.",
  },
];

async function main() {
  for (const permission of permissions) {
    await prisma.adminPermission.upsert({
      where: {
        key: permission.key,
      },
      update: {
        name: permission.name,
        description:
          permission.description,
      },
      create: permission,
    });
  }

  console.log(
    `✅ ${permissions.length} admin-kaarten gecontroleerd.`
  );
}

main()
  .catch((error) => {
    console.error(
      "❌ Permission seed mislukt:",
      error
    );

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });