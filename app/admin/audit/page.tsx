import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth/session";
import AuditRestoreButton from "./AuditRestoreButton";

export default async function AdminAuditPage() {
  const current =
    await requireAdmin();

  const logs =
    await prisma.auditLog.findMany({
      include: {
        admin: {
          select: {
            username: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
    });

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6">
      <div className="mx-auto w-full max-w-7xl">

        <a
          href="/admin"
          className="text-xs text-white/40 transition hover:text-orange-300"
        >
          ← Admin dashboard
        </a>

        <header className="mt-5 mb-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-orange-300">
            📜 ADMIN AUDIT
          </p>

          <h1 className="mt-1 text-2xl font-bold">
            Auditlog
          </h1>

          <p className="mt-1 text-xs text-white/40">
            Overzicht van beheeracties en wijzigingen.
          </p>
        </header>

        {logs.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-sm text-white/40">
            Nog geen auditloggegevens beschikbaar.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
            {logs.map((log, index) => (
              <article
                key={log.id}
                className={`p-4 ${
                  index > 0
                    ? "border-t border-white/10"
                    : ""
                }`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">

                      <span className="rounded-md border border-orange-400/20 bg-orange-500/[0.05] px-2 py-1 text-[9px] font-bold text-orange-300">
                        {log.action}
                      </span>

                      {log.targetType && (
                        <span className="text-[9px] text-white/30">
                          {log.targetType}
                        </span>
                      )}

                      {log.targetId && (
                        <span className="font-mono text-[9px] text-white/25">
                          {log.targetId}
                        </span>
                      )}

                    </div>

                    <p className="mt-2 text-xs text-white/60">
                      Uitgevoerd door{" "}
                      <span className="font-semibold text-white/80">
                        {log.admin?.username ||
                          "Onbekende admin"}
                      </span>

                      {log.admin?.role && (
                        <span className="ml-2 text-[9px] text-white/30">
                          {log.admin.role}
                        </span>
                      )}
                    </p>

                    {log.action ===
                      "CW_MISSED_ATTACKS_DELETED" &&
                      current.admin.role ===
                        "SUPERADMIN" && (
                        <AuditRestoreButton
                          auditId={log.id}
                        />
                      )}

                    {log.details && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-[9px] text-white/30 hover:text-white/60">
                          Details bekijken
                        </summary>

                        <pre className="mt-2 overflow-x-auto rounded-lg border border-white/10 bg-black/30 p-3 text-[9px] leading-relaxed text-white/50">
                          {formatDetails(
                            log.details
                          )}
                        </pre>
                      </details>
                    )}
                  </div>

                  <time
                    dateTime={
                      log.createdAt.toISOString()
                    }
                    className="shrink-0 text-[9px] text-white/25"
                  >
                    {formatDate(
                      log.createdAt
                    )}
                  </time>

                </div>
              </article>
            ))}
          </div>
        )}

        <p className="mt-4 text-[9px] text-white/20">
          {current.admin.role ===
          "SUPERADMIN"
            ? "SUPERADMIN: volledige auditweergave."
            : "Auditlog is alleen-lezen."}
        </p>

      </div>
    </main>
  );
}

function formatDetails(
  details: string
) {
  try {
    return JSON.stringify(
      JSON.parse(details),
      null,
      2
    );
  } catch {
    return details;
  }
}

function formatDate(
  date: Date
) {
  return new Intl.DateTimeFormat(
    "nl-NL",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}
