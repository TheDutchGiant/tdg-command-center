import { prisma } from "@/app/lib/prisma";
import { getCurrentAdmin } from "@/app/lib/auth/session";

export async function hasPermission(
  permissionKey: string
) {
  const current = await getCurrentAdmin();

  if (!current) {
    return false;
  }

  if (current.admin.role === "SUPERADMIN") {
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
    });

  return Boolean(permission);
}

export async function requirePermission(
  permissionKey: string
) {
  const current = await getCurrentAdmin();

  if (!current) {
    throw new Error("ADMIN_UNAUTHORIZED");
  }

  if (current.admin.role === "SUPERADMIN") {
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
    });

  if (!permission) {
    throw new Error(
      "ADMIN_PERMISSION_REQUIRED"
    );
  }

  return current;
}