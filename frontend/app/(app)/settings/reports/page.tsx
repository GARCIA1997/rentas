'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { reportsApi, MaintenanceReport, MaintenanceReportStatus, maintenanceReportStatusLabels } from '@/lib/api';
import { formatDate } from '@/lib/formatDate';
import { ArrowLeftIcon, ChevronRightIcon } from '@/components/icons';

const statusColors: Record<MaintenanceReportStatus, string> = {
  REPORTED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  IN_PROGRESS: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300',
  CLOSED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
};

// Listado global — la vía principal para llegar a la conversación de un tenant es
// desde su propio perfil (/tenants/[id]/profile → Reportes), pero este inbox sirve
// para ver de un vistazo qué necesita atención en todos los tenants a la vez.
export default function ReportsPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<MaintenanceReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    reportsApi
      .list(token)
      .then(setReports)
      .finally(() => setIsLoading(false));
  }, [token]);

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <button
        onClick={() => router.push('/settings')}
        className="flex items-center gap-1.5 text-muted hover:text-heading text-sm mb-4 -ml-1"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Configuración
      </button>

      <h1 className="text-2xl font-bold text-heading mb-2">Reportes de inquilinos</h1>
      <p className="text-sm text-muted mb-6">
        Incidencias reportadas desde el portal del inquilino, de todas las propiedades.
      </p>

      {isLoading ? (
        <p className="text-muted">Cargando...</p>
      ) : reports.length === 0 ? (
        <div className="bg-surface rounded-2xl shadow-sm p-6">
          <p className="text-muted text-sm">No hay reportes todavía.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((report) => (
            <Link
              key={report.id}
              href={`/tenants/${report.tenantId}/reports/${report.id}`}
              className="flex items-center gap-3 bg-surface rounded-2xl shadow-sm p-4 active:opacity-70 transition-opacity"
            >
              <div className="flex-1 min-w-0">
                <p className="text-heading font-semibold text-sm truncate">{report.tenant?.fullName ?? '—'}</p>
                <p className="text-muted text-xs truncate">
                  {report.property?.name ?? 'Sin propiedad'} · {formatDate(report.createdAt)}
                </p>
                <p className="text-heading text-sm mt-1.5 truncate">{report.description}</p>
              </div>
              <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[report.status]}`}>
                {maintenanceReportStatusLabels[report.status]}
              </span>
              <ChevronRightIcon className="w-4 h-4 text-muted shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </ProtectedRoute>
  );
}
