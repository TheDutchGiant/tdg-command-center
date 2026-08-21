import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/app/lib/auth/session";
import { getPermissionLevels } from "@/app/lib/auth/permissions";

type PermissionLevel =
  | "READ"
  | "EDIT"
  | "DELETE";

export default async function AdminPage() {
  const current = await getCurrentAdmin();

  if (!current) {
    redirect("/admin/login");
  }

  const isSuperadmin =
    current.admin.role === "SUPERADMIN";

  const permissions =
    await getPermissionLevels();

  const getLevel = (
    key: string
  ): PermissionLevel | "SUPERADMIN" | null => {
    if (isSuperadmin) {
      return "SUPERADMIN";
    }

    if (
      !permissions ||
      permissions === "SUPERADMIN"
    ) {
      return null;
    }

    return permissions[key] ?? null;
  };

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-orange-300">
                🛡️ TDG Phoenix
              </p>

              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
                Admin Command Center
              </h1>

              <p className="mt-2 text-sm text-white/55">
                Welkom, {current.admin.username}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/"
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/70 transition hover:border-orange-400/30 hover:bg-orange-500/10 hover:text-orange-300"
              >
                ⬅️ Legacy Hall
              </a>

              <div className="w-fit rounded-xl border border-orange-400/25 bg-orange-500/10 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-orange-300">
                  Rol
                </p>

                <p className="text-sm font-bold text-white">
                  {isSuperadmin
                    ? "👑 SUPERADMIN"
                    : "🛡️ ADMIN"}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Admin navigation */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

          {/* Dashboard */}
          <AdminCard
            icon="🏠"
            title="Dashboard"
            description="Overzicht van Phoenix en de actuele status."
            href="/admin"
            level="SUPERADMIN"
          />

          {/* CW */}
          <AdminCard
            icon="⚔️"
            title="CW beheer"
            description="Gemiste aanvallen en CW-beheer."
            href="/admin/cw"
            level={getLevel("CW")}
          />

          {/* CWL */}
          <AdminCard
            icon="🏆"
            title="CWL beheer"
            description="Aanmeldingen, selectiepool en CWL-indeling."
            href="/admin/cwl"
            level={getLevel("CWL")}
          />

          {/* API */}
          <AdminCard
            icon="🔄"
            title="API beheer"
            description="Sync-status en eenmalige synchronisaties."
            href="/admin/api"
            level={getLevel("API")}
          />

          {/* Audit */}
          <AdminCard
            icon="📜"
            title="Auditlog"
            description="Bekijk beheeracties en wijzigingen."
            href="/admin/audit"
            level={getLevel("AUDIT")}
          />

          {/* Admin management */}
          {isSuperadmin && (
            <AdminCard
              icon="👑"
              title="Admin beheer"
              description="Beheerders, rechten, apparaten en sessies."
              href="/admin/admins"
              accent
              level="SUPERADMIN"
            />
          )}

          {/* Override */}
          {isSuperadmin && (
            <AdminCard
              icon="↩️"
              title="Override & herstel"
              description="Beschikbare wijzigingen terugdraaien."
              href="/admin/override"
              accent
              level="SUPERADMIN"
            />
          )}
        </section>

        {/* Permission explanation */}
        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-sm font-semibold text-white">
            🔐 Rechten
          </h2>

          <p className="mt-2 text-sm leading-6 text-white/50">
            Je kunt alle onderdelen bekijken. Je rechten bepalen
            welke acties je binnen ieder onderdeel mag uitvoeren.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <PermissionInfo
              icon="👁️"
              title="Alleen lezen"
              description="Bekijken zonder wijzigingen."
            />

            <PermissionInfo
              icon="✏️"
              title="Bewerken / gebruiken"
              description="Bekijken en normale beheeracties uitvoeren."
            />

            <PermissionInfo
              icon="🗑️"
              title="Verwijderen"
              description="Alles van bewerken, plus verwijderen."
            />
          </div>
        </section>

        {/* Session information */}
        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-sm font-semibold text-white">
            🔐 Huidige sessie
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
            <InfoItem
              label="Gebruiker"
              value={current.admin.username}
            />

            <InfoItem
              label="Rol"
              value={current.admin.role}
            />

            <InfoItem
              label="Sessie geldig tot"
              value={current.session.expiresAt.toLocaleString(
                "nl-NL"
              )}
            />
          </div>
        </section>

      </div>
    </main>
  );
}

function AdminCard({
  icon,
  title,
  description,
  href,
  accent = false,
  level,
}: {
  icon: string;
  title: string;
  description: string;
  href: string;
  accent?: boolean;
  level:
    | PermissionLevel
    | "SUPERADMIN"
    | null;
}) {
  return (
    <a
      href={href}
      className={`group rounded-2xl border p-5 transition ${
        accent
          ? "border-orange-400/20 bg-orange-500/[0.06] hover:border-orange-400/40 hover:bg-orange-500/[0.1]"
          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="text-2xl">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <h2 className="font-semibold text-white">
              {title}
            </h2>

            <PermissionBadge level={level} />
          </div>

          <p className="mt-1 text-sm leading-5 text-white/50">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-5 text-xs text-white/30 transition group-hover:text-orange-300">
        Openen →
      </div>
    </a>
  );
}

function PermissionBadge({
  level,
}: {
  level:
    | PermissionLevel
    | "SUPERADMIN"
    | null;
}) {
  if (level === "SUPERADMIN") {
    return (
      <span className="w-fit rounded-lg border border-orange-400/30 bg-orange-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-orange-300">
        👑 Alles
      </span>
    );
  }

  if (level === "DELETE") {
    return (
      <span className="w-fit rounded-lg border border-red-400/30 bg-red-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-300">
        🗑️ Verwijderen
      </span>
    );
  }

  if (level === "EDIT") {
    return (
      <span className="w-fit rounded-lg border border-yellow-400/30 bg-yellow-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-yellow-300">
        ✏️ Bewerken
      </span>
    );
  }

  if (level === "READ") {
    return (
      <span className="w-fit rounded-lg border border-blue-400/30 bg-blue-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-blue-300">
        👁️ Alleen lezen
      </span>
    );
  }

  return (
    <span className="w-fit rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/30">
      Geen rechten
    </span>
  );
}

function PermissionInfo({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-sm font-medium text-white">
        {icon} {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-white/40">
        {description}
      </p>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-white/35">
        {label}
      </p>

      <p className="mt-1 truncate font-medium text-white">
        {value}
      </p>
    </div>
  );
}