'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ToastProvider';
import {
  reportsApi,
  MaintenanceReport,
  MaintenanceReportStatus,
  maintenanceReportStatusLabels,
} from '@/lib/api';
import { formatDate } from '@/lib/formatDate';
import { ArrowLeftIcon } from '@/components/icons';

const statusColors: Record<MaintenanceReportStatus, string> = {
  REPORTED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  IN_PROGRESS: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300',
  RESOLVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
};

const STATUS_ORDER: MaintenanceReportStatus[] = ['REPORTED', 'IN_PROGRESS', 'RESOLVED'];

export default function ReportsPage() {
  const { token } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [reports, setReports] = useState<MaintenanceReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadReports = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      setReports(await reportsApi.list(token));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleStatusChange = async (id: string, status: MaintenanceReportStatus) => {
    if (!token) return;
    setUpdatingId(id);
    try {
      const updated = await reportsApi.updateStatus(id, status, token);
      setReports((prev) => prev.map((r) => (r.id === id ? updated : r)));
      showToast('Estatus actualizado. Se notificó al inquilino.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al actualizar el estatus', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

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
        Incidencias reportadas desde el portal del inquilino. Al cambiar el estatus, se notifica al inquilino
        dentro de la app.
      </p>

      {isLoading ? (
        <p className="text-muted">Cargando...</p>
      ) : reports.length === 0 ? (
        <div className="bg-surface rounded-2xl shadow-sm p-6">
          <p className="text-muted text-sm">No hay reportes todavía.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="bg-surface rounded-2xl shadow-sm p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-heading font-semibold text-sm">{report.tenant?.fullName ?? '—'}</p>
                  <p className="text-muted text-xs">
                    {report.property?.name ?? 'Sin propiedad'} · {formatDate(report.createdAt)}
                  </p>
                </div>
                <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[report.status]}`}>
                  {maintenanceReportStatusLabels[report.status]}
                </span>
              </div>
              <p className="text-heading text-sm mb-3">{report.description}</p>
              <div className="flex gap-2">
                {STATUS_ORDER.map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(report.id, status)}
                    disabled={updatingId === report.id || report.status === status}
                    className={`flex-1 text-xs font-medium py-2 rounded-lg border transition-colors disabled:opacity-40 ${
                      report.status === status
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-black/10 dark:border-white/10 text-muted hover:text-heading hover:bg-canvas'
                    }`}
                  >
                    {maintenanceReportStatusLabels[status]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </ProtectedRoute>
  );
}
