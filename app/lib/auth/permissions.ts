import { prisma } from "@/app/lib/prisma";
import { getCurrentAdmin } from "@/app/lib/auth/session";

export type AdminPermissionLevel =
  | "READ"
  | "EDIT"
  | "DELETE";

const LEVEL_VALUE: Record<
  AdminPermissionLevel,
  number
> = {
  READ: 1,
  EDIT: 2,
  DELETE: 3,
};

export function permissionLevelAllows(
  actualLevel:
    | AdminPermissionLevel
    | null
    | undefined,
  requiredLevel: AdminPermissionLevel
) {
  if (!actualLevel) {
    return false;
  }

  return (
    LEVEL_VALUE[actualLevel] >=
    LEVEL_VALUE[requiredLevel]
  );
}

export async function getPermissionLevels() {
  const current = await getCurrentAdmin();

  if (!current) {
    return null;
  }

  if (current.admin.role === "SUPERADMIN") {
    return "SUPERADMIN" as const;
  }

  const permissions =
    await prisma.adminUserPermission.findMany({
      where: {
        adminId: current.admin.id,
      },
      include: {
        permission: true,
      },
    });

  return Object.fromEntries(
    permissions.map((item) => [
      item.permission.key,
      item.level,
    ])
  ) as Record<
    string,
    AdminPermissionLevel
  >;
}

export async function hasPermission(
  permissionKey: string,
  requiredLevel: AdminPermissionLevel = "READ"
) {
  const current = await getCurrentAdmin();

  if (!current) {
    return false;
  }

  if (current.admin.role === "SUPERADMIN") {
    return true;
  }

  /*
   * Iedere normale ADMIN mag alles bekijken.
   * EDIT en DELETE worden wél per module gecontroleerd.
   */
  if (requiredLevel === "READ") {
    return true;
  }

  const permission =
    await prisma.adminUserPermission.findFirst({
      where: {
        adminId: current.admin.id,
        permission: {
          key: permissionKey,
        },
      },
      select: {
        level: true,
      },
    });

  return permissionLevelAllows(
    permission?.level,
    requiredLevel
  );
}

export async function requirePermission(
  permissionKey: string,
  requiredLevel: AdminPermissionLevel = "READ"
) {
  const current = await getCurrentAdmin();

  if (!current) {
    throw new Error("ADMIN_UNAUTHORIZED");
  }

  if (current.admin.role === "SUPERADMIN") {
    return current;
  }

  if (requiredLevel === "READ") {
    return current;
  }

  const permission =
    await prisma.adminUserPermission.findFirst({
      where: {
        adminId: current.admin.id,
        permission: {
          key: permissionKey,
        },
      },
      select: {
        level: true,
      },
    });

  if (
    !permissionLevelAllows(
      permission?.level,
      requiredLevel
    )
  ) {
    throw new Error(
      "ADMIN_PERMISSION_REQUIRED"
    );
  }

  return current;
}