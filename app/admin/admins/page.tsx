import { prisma } from "@/app/lib/prisma";
import { requireSuperadmin } from "@/app/lib/auth/session";
import { hashPassword } from "@/app/lib/auth/password";
import { AdminPermissionLevel } from "@prisma/client";
import DeleteAdminButton from "./DeleteAdminButton";
import ResetAdminPasswordButton from "./ResetAdminPasswordButton";

const levels = [
  { value: "READ", label: "👁️ Lezen" },
  { value: "EDIT", label: "✏️ Bewerken" },
  { value: "DELETE", label: "🗑️ Verwijderen" },
] as const;

async function createAdmin(formData: FormData) {
  "use server";

  await requireSuperadmin();

  const username = String(
    formData.get("username") || ""
  ).trim();

  const password = String(
    formData.get("password") || ""
  );

  if (username.length < 3) {
    throw new Error(
      "Gebruikersnaam moet minimaal 3 tekens bevatten."
    );
  }

  if (password.length < 8) {
    throw new Error(
      "Wachtwoord moet minimaal 8 tekens bevatten."
    );
  }

  const existingAdmin =
    await prisma.adminUser.findUnique({
      where: { username },
    });

  if (existingAdmin) {
    throw new Error(
      "Deze gebruikersnaam bestaat al."
    );
  }

  const permissions =
    await prisma.adminPermission.findMany();

  const selectedPermissions =
    permissions.map((permission) => {
      const selected = String(
        formData.get(
          `permission_${permission.key}`
        ) || "READ"
      );

      const level: AdminPermissionLevel =
        selected === "DELETE"
          ? AdminPermissionLevel.DELETE
          : selected === "EDIT"
            ? AdminPermissionLevel.EDIT
            : AdminPermissionLevel.READ;

      return {
        permission: {
          connect: {
            id: permission.id,
          },
        },
        level,
      };
    });

  const passwordHash =
    hashPassword(password);

  await prisma.adminUser.create({
    data: {
      username,
      passwordHash,
      role: "ADMIN",
      permissions: {
        create: selectedPermissions,
      },
    },
  });
}

async function updateAdmin(formData: FormData) {
  "use server";

  const current =
    await requireSuperadmin();

  const adminId = Number(
    formData.get("adminId")
  );

  if (!Number.isInteger(adminId)) {
    throw new Error(
      "Ongeldig admin-ID."
    );
  }

  if (adminId === current.admin.id) {
    throw new Error(
      "Je kunt je eigen SUPERADMIN-account niet aanpassen."
    );
  }

  const admin =
    await prisma.adminUser.findUnique({
      where: {
        id: adminId,
      },
    });

  if (!admin) {
    throw new Error(
      "Admin bestaat niet."
    );
  }

  if (admin.role === "SUPERADMIN") {
    throw new Error(
      "Een SUPERADMIN kan niet via dit formulier worden aangepast."
    );
  }

  const isActive =
    formData.get("isActive") === "on";

  const permissions =
    await prisma.adminPermission.findMany();

  await prisma.$transaction(async (tx) => {
    await tx.adminUser.update({
      where: {
        id: adminId,
      },
      data: {
        isActive,
      },
    });

    for (const permission of permissions) {
      const selectedLevel =
        String(
          formData.get(
            `edit_permission_${permission.key}`
          ) || "READ"
        );

      const level: AdminPermissionLevel =
        selectedLevel === "DELETE"
          ? AdminPermissionLevel.DELETE
          : selectedLevel === "EDIT"
            ? AdminPermissionLevel.EDIT
            : AdminPermissionLevel.READ;

      await tx.adminUserPermission.upsert({
        where: {
          adminId_permissionId: {
            adminId,
            permissionId: permission.id,
          },
        },
        update: {
          level,
        },
        create: {
          adminId,
          permissionId: permission.id,
          level,
        },
      });
    }
  });
}

async function revokeSession(formData: FormData) {
  "use server";

  const current =
    await requireSuperadmin();

  const sessionId = String(
    formData.get("sessionId") || ""
  );

  if (!sessionId) {
    throw new Error(
      "Ongeldige sessie."
    );
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
    throw new Error(
      "Sessie bestaat niet."
    );
  }

  if (
    session.admin.role === "SUPERADMIN"
  ) {
    throw new Error(
      "Een SUPERADMIN-sessie kan hier niet worden ingetrokken."
    );
  }

  if (
    session.adminId === current.admin.id
  ) {
    throw new Error(
      "Je kunt je eigen sessie hier niet intrekken."
    );
  }

  await prisma.adminSession.update({
    where: {
      id: sessionId,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

async function revokeAllSessions(
  formData: FormData
) {
  "use server";

  const current =
    await requireSuperadmin();

  const adminId = Number(
    formData.get("adminId")
  );

  if (!Number.isInteger(adminId)) {
    throw new Error(
      "Ongeldig admin-ID."
    );
  }

  if (adminId === current.admin.id) {
    throw new Error(
      "Je kunt je eigen sessies hier niet intrekken."
    );
  }

  const admin =
    await prisma.adminUser.findUnique({
      where: {
        id: adminId,
      },
    });

  if (!admin) {
    throw new Error(
      "Admin bestaat niet."
    );
  }

  if (admin.role === "SUPERADMIN") {
    throw new Error(
      "SUPERADMIN-sessies kunnen hier niet worden ingetrokken."
    );
  }

  await prisma.adminSession.updateMany({
    where: {
      adminId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export default async function AdminManagementPage() {
  await requireSuperadmin();

  const [admins, permissions] =
    await Promise.all([
      prisma.adminUser.findMany({
        orderBy: [
          { role: "desc" },
          { username: "asc" },
        ],
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
          sessions: {
            where: {
              revokedAt: null,
            },
            orderBy: {
              lastSeenAt: "desc",
            },
          },
        },
      }),

      prisma.adminPermission.findMany({
        orderBy: {
          name: "asc",
        },
      }),
    ]);

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">

        <a
          href="/admin"
          className="text-xs text-white/40 hover:text-orange-300"
        >
          ← Admin dashboard
        </a>

        <header className="mt-5 mb-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-orange-300">
            👑 SUPERADMIN
          </p>

          <h1 className="mt-1 text-2xl font-bold">
            Admin beheer
          </h1>

          <p className="mt-1 text-xs text-white/40">
            Accounts, rechten en sessies beheren.
          </p>
        </header>

        {/* Nieuwe admin */}
        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h2 className="mb-4 text-sm font-semibold">
            ➕ Nieuwe admin
          </h2>

          <form
            action={createAdmin}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                name="username"
                type="text"
                required
                minLength={3}
                placeholder="Gebruikersnaam"
                autoComplete="username"
                className="rounded-lg border border-white/10 bg-black px-3 py-2.5 text-sm outline-none focus:border-orange-400/50"
              />

              <input
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="Tijdelijk wachtwoord"
                autoComplete="new-password"
                className="rounded-lg border border-white/10 bg-black px-3 py-2.5 text-sm outline-none focus:border-orange-400/50"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold">
                  🔐 Rechten
                </p>

                <p className="text-[10px] text-white/30">
                  Geen keuze = alleen lezen
                </p>
              </div>

              <div className="overflow-hidden rounded-lg border border-white/10">
                {permissions.map(
                  (permission, index) => (
                    <div
                      key={permission.id}
                      className={`grid grid-cols-1 gap-2 px-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center ${
                        index !==
                        permissions.length - 1
                          ? "border-b border-white/10"
                          : ""
                      }`}
                    >
                      <div>
                        <p className="text-xs font-semibold">
                          {permission.name}
                        </p>

                        <p className="text-[10px] text-white/30">
                          {permission.key}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-1">
                        {levels.map(
                          (level) => (
                            <label
                              key={level.value}
                              className="cursor-pointer"
                            >
                              <input
                                type="radio"
                                name={`permission_${permission.key}`}
                                value={level.value}
                                className="peer sr-only"
                              />

                              <span className="block rounded-md border border-white/10 px-2 py-2 text-center text-[10px] text-white/50 transition hover:bg-white/[0.05] peer-checked:border-orange-400/60 peer-checked:bg-orange-500/10 peer-checked:text-orange-200">
                                {level.label}
                              </span>
                            </label>
                          )
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            <button
              type="submit"
              className="rounded-lg bg-orange-500 px-4 py-2.5 text-xs font-bold text-black hover:bg-orange-400"
            >
              👑 Admin aanmaken
            </button>
          </form>
        </section>

        {/* Bestaande admins */}
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold">
            👥 Bestaande admins
          </h2>

          <div className="space-y-2">
            {admins.map((admin) => {
              const isSuperadmin =
                admin.role === "SUPERADMIN";

              return (
                <article
                  key={admin.id}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
                >
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">
                        {admin.username}
                      </span>

                      <span className="rounded bg-white/10 px-2 py-0.5 text-[9px] font-bold">
                        {isSuperadmin
                          ? "SUPERADMIN"
                          : "ADMIN"}
                      </span>

                      <span
                        className={`rounded px-2 py-0.5 text-[9px] font-bold ${
                          admin.isActive
                            ? "bg-green-500/10 text-green-300"
                            : "bg-red-500/10 text-red-300"
                        }`}
                      >
                        {admin.isActive
                          ? "ACTIEF"
                          : "INACTIEF"}
                      </span>
                    </div>

                    {!isSuperadmin && (
                      <div className="flex flex-wrap items-center gap-2">

                        <span className="text-[10px] text-white/30">
                          {admin.sessions.length} sessie(s)
                        </span>

                        <details>
                          <summary className="cursor-pointer list-none rounded-lg border border-orange-400/20 bg-orange-500/10 px-3 py-2 text-xs font-semibold text-orange-300 hover:bg-orange-500/20">
                            ✏️ Bewerken
                          </summary>

                          <form
                            action={updateAdmin}
                            className="mt-3 rounded-lg border border-white/10 bg-black/30 p-3"
                          >
                            <input
                              type="hidden"
                              name="adminId"
                              value={admin.id}
                            />

                            <label className="flex items-center gap-2 text-xs text-white/70">
                              <input
                                type="checkbox"
                                name="isActive"
                                defaultChecked={
                                  admin.isActive
                                }
                                className="h-4 w-4 accent-orange-500"
                              />

                              Account actief
                            </label>

                            <div className="mt-3 space-y-2">
                              {permissions.map(
                                (permission) => {
                                  const assigned =
                                    admin.permissions.find(
                                      (item) =>
                                        item.permissionId ===
                                        permission.id
                                    );

                                  const currentLevel =
                                    assigned?.level ||
                                    "READ";

                                  return (
                                    <div
                                      key={permission.id}
                                      className="grid grid-cols-1 gap-2 border-t border-white/10 pt-2 sm:grid-cols-[1fr_auto] sm:items-center"
                                    >
                                      <span className="text-xs font-medium">
                                        {permission.name}
                                      </span>

                                      <div className="grid grid-cols-3 gap-1">
                                        {levels.map(
                                          (level) => (
                                            <label
                                              key={
                                                level.value
                                              }
                                              className="cursor-pointer"
                                            >
                                              <input
                                                type="radio"
                                                name={`edit_permission_${permission.key}`}
                                                value={
                                                  level.value
                                                }
                                                defaultChecked={
                                                  currentLevel ===
                                                  level.value
                                                }
                                                className="peer sr-only"
                                              />

                                              <span className="block rounded-md border border-white/10 px-2 py-1.5 text-center text-[10px] text-white/50 peer-checked:border-orange-400/60 peer-checked:bg-orange-500/10 peer-checked:text-orange-200">
                                                {
                                                  level.label
                                                }
                                              </span>
                                            </label>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  );
                                }
                              )}
                            </div>

                            <button
                              type="submit"
                              className="mt-3 rounded-lg bg-orange-500 px-3 py-2 text-xs font-bold text-black hover:bg-orange-400"
                            >
                              💾 Opslaan
                            </button>
                          </form>
                        </details>

                        <details>
                          <summary className="cursor-pointer list-none rounded-lg border border-blue-400/20 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-500/20">
                            📱 Sessies
                          </summary>

                          <div className="mt-3 rounded-lg border border-white/10 bg-black/30 p-3">

                            {admin.sessions.length === 0 ? (
                              <p className="text-xs text-white/35">
                                Geen actieve sessies.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {admin.sessions.map(
                                  (session) => (
                                    <div
                                      key={session.id}
                                      className="rounded-lg border border-white/10 bg-white/[0.02] p-3"
                                    >
                                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">

                                        <div className="min-w-0">
                                          <p className="text-xs font-medium text-white/80">
                                            {session.userAgent ||
                                              "Onbekend apparaat"}
                                          </p>

                                          <p className="mt-1 text-[10px] text-white/35">
                                            IP:{" "}
                                            {session.ipAddress ||
                                              "Onbekend"}
                                          </p>

                                          <p className="text-[10px] text-white/35">
                                            Laatst actief:{" "}
                                            {session.lastSeenAt.toLocaleString(
                                              "nl-NL"
                                            )}
                                          </p>
                                        </div>

                                        <form
                                          action={
                                            revokeSession
                                          }
                                        >
                                          <input
                                            type="hidden"
                                            name="sessionId"
                                            value={
                                              session.id
                                            }
                                          />

                                          <button
                                            type="submit"
                                            className="rounded-md border border-red-400/20 bg-red-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-red-300 hover:bg-red-500/20"
                                          >
                                            🚫 Intrekken
                                          </button>
                                        </form>

                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            )}

                            {admin.sessions.length > 0 && (
                              <form
                                action={
                                  revokeAllSessions
                                }
                                className="mt-3 border-t border-white/10 pt-3"
                              >
                                <input
                                  type="hidden"
                                  name="adminId"
                                  value={admin.id}
                                />

                                <button
                                  type="submit"
                                  className="w-full rounded-md border border-red-400/20 bg-red-500/10 px-3 py-2 text-[10px] font-semibold text-red-300 hover:bg-red-500/20"
                                >
                                  🔒 Alle sessies intrekken
                                </button>
                              </form>
                            )}

                          </div>
                        </details>

                        <ResetAdminPasswordButton
                          adminId={admin.id}
                          username={admin.username}
                        />

                        <DeleteAdminButton
                          adminId={admin.id}
                          username={admin.username}
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {isSuperadmin ? (
                      <span className="rounded-md border border-orange-400/20 bg-orange-500/10 px-2 py-1 text-[10px] text-orange-200">
                        👑 Alles
                      </span>
                    ) : (
                      permissions.map(
                        (permission) => {
                          const assigned =
                            admin.permissions.find(
                              (item) =>
                                item.permissionId ===
                                permission.id
                            );

                          const level =
                            assigned?.level ||
                            "READ";

                          return (
                            <span
                              key={permission.id}
                              className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-white/60"
                            >
                              {permission.name}:{" "}
                              {level === "READ" &&
                                "👁️"}

                              {level === "EDIT" &&
                                "✏️"}

                              {level === "DELETE" &&
                                "🗑️"}
                            </span>
                          );
                        }
                      )
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

      </div>
    </main>
  );
}