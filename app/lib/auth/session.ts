import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/app/lib/prisma";

const SESSION_COOKIE = "phoenix_admin_session";
const DEVICE_COOKIE = "phoenix_admin_device";

const IDLE_TIMEOUT_HOURS = 1;
const DEVICE_DURATION_DAYS = 365;

function getIdleExpirationDate(now: Date) {
  return new Date(
    now.getTime() +
      IDLE_TIMEOUT_HOURS * 60 * 60 * 1000
  );
}

export async function createAdminSession(
  adminId: number,
  userAgent?: string,
  ipAddress?: string
) {
  const cookieStore = await cookies();

  let deviceId =
    cookieStore.get(DEVICE_COOKIE)?.value;

  if (!deviceId) {
    deviceId = crypto.randomBytes(24).toString("hex");

    const deviceExpiresAt = new Date(
      Date.now() +
        DEVICE_DURATION_DAYS *
          24 *
          60 *
          60 *
          1000
    );

    cookieStore.set(DEVICE_COOKIE, deviceId, {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: deviceExpiresAt,
      path: "/",
    });
  }

  const sessionId = crypto.randomBytes(32).toString("hex");

  const admin = await prisma.adminUser.findUnique({
    where: {
      id: adminId,
    },
    select: {
      role: true,
    },
  });

  if (!admin) {
    throw new Error("ADMIN_NOT_FOUND");
  }

  const now = new Date();

  const expiresAt =
    admin.role === "SUPERADMIN"
      ? new Date("2099-12-31T23:59:59.999Z")
      : getIdleExpirationDate(now);

  await prisma.adminSession.create({
    data: {
      id: sessionId,
      adminId,
      deviceId,
      userAgent,
      ipAddress,
      lastSeenAt: now,
      expiresAt,
    },
  });

  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure:
      process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return sessionId;
}

export async function getCurrentAdmin() {
  const cookieStore = await cookies();

  const sessionId =
    cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionId) {
    return null;
  }

  const session =
    await prisma.adminSession.findUnique({
      where: {
        id: sessionId,
      },
      include: {
        admin: true,
      },
    });

  if (!session) {
    return null;
  }

  const now = new Date();

  const idleExpiration =
    session.admin.role === "SUPERADMIN"
      ? null
      : getIdleExpirationDate(
          session.lastSeenAt
        );

  const sessionExpired =
    session.expiresAt <= now ||
    (idleExpiration !== null &&
      idleExpiration <= now);

  if (
    session.revokedAt ||
    sessionExpired ||
    !session.admin.isActive
  ) {
    await prisma.adminSession.updateMany({
      where: {
        id: session.id,
      },
      data: {
        revokedAt: now,
      },
    });

    return null;
  }

  const newExpiresAt =
    session.admin.role === "SUPERADMIN"
      ? session.expiresAt
      : getIdleExpirationDate(now);

  const updatedSession =
    await prisma.adminSession.update({
      where: {
        id: session.id,
      },
      data: {
        lastSeenAt: now,
        expiresAt: newExpiresAt,
      },
    });

  return {
    admin: session.admin,
    session: updatedSession,
  };
}

export async function requireAdmin() {
  const current =
    await getCurrentAdmin();

  if (!current) {
    throw new Error(
      "ADMIN_UNAUTHORIZED"
    );
  }

  return current;
}

export async function requireSuperadmin() {
  const current =
    await getCurrentAdmin();

  if (!current) {
    throw new Error(
      "ADMIN_UNAUTHORIZED"
    );
  }

  if (
    current.admin.role !==
    "SUPERADMIN"
  ) {
    throw new Error(
      "SUPERADMIN_REQUIRED"
    );
  }

  return current;
}

export async function destroyCurrentSession() {
  const cookieStore = await cookies();

  const sessionId =
    cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    await prisma.adminSession.updateMany({
      where: {
        id: sessionId,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  cookieStore.delete(SESSION_COOKIE);
}