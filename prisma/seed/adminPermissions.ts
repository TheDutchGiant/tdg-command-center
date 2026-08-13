import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const permissions = [
  {
    key: "CW_VIEW",
    name: "CW bekijken",
    description: "CW-informatie bekijken.",
  },
  {
    key: "CW_MISSED_ATTACKS",
    name: "Gemiste CW-aanvallen beheren",
    description:
      "Gemiste aanvallen bekijken, aanpassen en verwijderen.",
  },
  {
    key: "CWL_VIEW",
    name: "CWL bekijken",
    description:
      "CWL-informatie en resultaten bekijken.",
  },
  {
    key: "CWL_APPLICATIONS",
    name: "CWL-aanmeldingen beheren",
    description:
      "CWL-aanmeldingen bekijken en beheren.",
  },
  {
    key: "CWL_ASSIGNMENT",
    name: "CWL-indeling beheren",
    description:
      "CWL-indelingen bekijken en aanpassen.",
  },
  {
    key: "API_VIEW",
    name: "API-status bekijken",
    description:
      "Synchronisatie- en API-status bekijken.",
  },
  {
    key: "API_SYNC",
    name: "Handmatige API-sync",
    description:
      "Een eenmalige API-synchronisatie uitvoeren.",
  },
  {
    key: "AUDIT_VIEW",
    name: "Auditlog bekijken",
    description:
      "Beheeracties en wijzigingen bekijken.",
  },
  {
    key: "DATA_DELETE",
    name: "Data verwijderen",
    description:
      "Toegestane gegevens verwijderen.",
  },
  {
    key: "OVERRIDE",
    name: "Override en herstel",
    description:
      "Beschikbare acties terugdraaien of herstellen.",
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
    `✅ ${permissions.length} adminrechten gecontroleerd.`
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