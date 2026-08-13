import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { requireSuperadmin } from "@/app/lib/auth/session";
import bcrypt from "bcryptjs";

async function createAdmin(formData: FormData) {
  "use server";

  await requireSuperadmin();

  const username = String(
    formData.get("username") || ""
  ).trim();

  const password = String(
    formData.get("password") || ""
  );

  const permissionKeys = formData.getAll(
    "permissions"
  ).map(String);

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
      where: {
        username,
      },
    });

  if (existingAdmin) {
    throw new Error(
      "Deze gebruikersnaam bestaat al."
    );
  }

  const permissions =
    await prisma.adminPermission.findMany({
      where: {
        key: {
          in: permissionKeys,
        },
      },
    });

  if (
    permissions.length !==
    new Set(permissionKeys).size
  ) {
    throw new Error(
      "Een of meer geselecteerde rechten zijn ongeldig."
    );
  }

  const passwordHash =
    await bcrypt.hash(password, 12);

  await prisma.adminUser.create({
    data: {
      username,
      passwordHash,
      role: "ADMIN",
      permissions: {
        create: permissions.map(
          (permission) => ({
            permissionId: permission.id,
          })
        ),
      },
    },
  });

  redirect("/admin/admins?created=1");
}

export default async function AdminManagementPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
  }>;
}) {
  await requireSuperadmin();

  const params = await searchParams;

  const admins =
    await prisma.adminUser.findMany({
      orderBy: [
        {
          role: "desc",
        },
        {
          username: "asc",
        },
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
    });

  const permissions =
    await prisma.adminPermission.findMany({
      orderBy: {
        name: "asc",
      },
    });

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-6xl">

        {/* Header */}
        <header className="mb-8">
          <a
            href="/admin"
            className="mb-4 inline-block text-sm text-white/50 transition hover:text-orange-300"
          >
            ← Terug naar Admin Dashboard
          </a>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-orange-300">
                👑 SUPERADMIN
              </p>

              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
                Admin beheer
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-white/50">
                Beheer admins, hun rechten en actieve
                sessies.
              </p>
            </div>

            <div className="w-fit rounded-xl border border-orange-400/20 bg-orange-500/10 px-4 py-2">
              <p className="text-xs text-orange-300">
                Beheerders
              </p>

              <p className="text-lg font-bold">
                {admins.length}
              </p>
            </div>
          </div>
        </header>

        {/* Success */}
        {params.created === "1" && (
          <div className="mb-6 rounded-2xl border border-green-400/20 bg-green-500/10 px-4 py-3 text-sm text-green-200">
            ✅ Admin is succesvol aangemaakt.
          </div>
        )}

        {/* Create admin */}
        <section className="rounded-2xl border border-orange-400/15 bg-orange-500/[0.04] p-5 sm:p-6">
          <div className="mb-6">
            <h2 className="text-lg font-bold">
              ➕ Nieuwe admin
            </h2>

            <p className="mt-1 text-sm text-white/45">
              Bepaal hier direct welke onderdelen deze
              admin mag bekijken of beheren.
            </p>
          </div>

          <form
            action={createAdmin}
            className="space-y-6"
          >
            {/* Account */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="username"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Gebruikersnaam
                </label>

                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  minLength={3}
                  autoComplete="username"
                  placeholder="Bijvoorbeeld TDG-Klaas"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 text-sm outline-none transition focus:border-orange-400/60"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Tijdelijk/nieuw wachtwoord
                </label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Minimaal 8 tekens"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 text-sm outline-none transition focus:border-orange-400/60"
                />
              </div>
            </div>

            {/* Permissions */}
            <div>
              <div className="mb-3">
                <h3 className="text-sm font-semibold">
                  Rechten
                </h3>

                <p className="mt-1 text-xs text-white/40">
                  Alleen geselecteerde onderdelen worden
                  straks zichtbaar voor deze admin.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {permissions.map(
                  (permission) => (
                    <label
                      key={permission.id}
                      className="flex cursor-pointer gap-3 rounded-xl border border-white/10 bg-black/20 p-4 transition hover:border-orange-400/30"
                    >
                      <input
                        type="checkbox"
                        name="permissions"
                        value={permission.key}
                        className="mt-1 h-4 w-4 accent-orange-500"
                      />

                      <span className="min-w-0">
                        <span className="block text-sm font-medium">
                          {permission.name}
                        </span>

                        {permission.description && (
                          <span className="mt-1 block text-xs leading-5 text-white/40">
                            {permission.description}
                          </span>
                        )}
                      </span>
                    </label>
                  )
                )}
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold transition hover:bg-orange-400 sm:w-auto"
            >
              👑 Admin aanmaken
            </button>
          </form>
        </section>

        {/* Existing admins */}
        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-lg font-bold">
              👥 Bestaande admins
            </h2>

            <p className="mt-1 text-sm text-white/40">
              Overzicht van accounts en huidige rechten.
            </p>
          </div>

          <div className="space-y-4">
            {admins.map((admin) => {
              const isSuperadmin =
                admin.role === "SUPERADMIN";

              return (
                <article
                  key={admin.id}
                  className={`rounded-2xl border p-5 ${
                    isSuperadmin
                      ? "border-orange-400/25 bg-orange-500/[0.05]"
                      : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">
                          {admin.username}
                        </h3>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                            isSuperadmin
                              ? "bg-orange-500/15 text-orange-300"
                              : "bg-white/10 text-white/60"
                          }`}
                        >
                          {isSuperadmin
                            ? "SUPERADMIN"
                            : "ADMIN"}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
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

                      <p className="mt-2 text-xs text-white/35">
                        Aangemaakt op{" "}
                        {admin.createdAt.toLocaleDateString(
                          "nl-NL"
                        )}
                      </p>
                    </div>

                    <div className="text-left lg:text-right">
                      <p className="text-xs text-white/35">
                        Actieve sessies
                      </p>

                      <p className="mt-1 font-semibold">
                        {admin.sessions.length}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/35">
                      Rechten
                    </p>

                    {isSuperadmin ? (
                      <div className="rounded-xl border border-orange-400/15 bg-orange-500/5 px-4 py-3 text-sm text-orange-200">
                        👑 Alle rechten
                      </div>
                    ) : admin.permissions.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {admin.permissions.map(
                          (item) => (
                            <span
                              key={
                                item.permission.id
                              }
                              className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-xs text-white/65"
                            >
                              {item.permission.name}
                            </span>
                          )
                        )}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/40">
                        Geen rechten toegewezen.
                      </div>
                    )}
                  </div>

                  {!isSuperadmin &&
                    admin.sessions.length >
                      0 && (
                      <div className="mt-5 border-t border-white/10 pt-4">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/35">
                          Actieve apparaten
                        </p>

                        <div className="space-y-2">
                          {admin.sessions.map(
                            (session) => (
                              <div
                                key={session.id}
                                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/50"
                              >
                                <div>
                                  {session.userAgent ||
                                    "Onbekend apparaat"}
                                </div>

                                <div className="mt-1 text-white/30">
                                  Laatst actief:{" "}
                                  {session.lastSeenAt.toLocaleString(
                                    "nl-NL"
                                  )}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </article>
              );
            })}
          </div>
        </section>

      </div>
    </main>
  );
}