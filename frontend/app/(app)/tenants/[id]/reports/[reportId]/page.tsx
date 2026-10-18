'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ReportConversation } from '@/components/ReportConversation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ToastProvider';
import { reportsApi, MaintenanceReport, MaintenanceReportStatus, maintenanceReportStatusLabels } from '@/lib/api';

const POLL_INTERVAL_MS = 15_000;
const STATUS_ORDER: MaintenanceReportStatus[] = ['REPORTED', 'IN_PROGRESS', 'CLOSED'];

export default function AdminReportDetailPage() {
  const { token } = useAuth();
  const params = useParams();
  const tenantId = params?.id as string;
  const reportId = params?.reportId as string;
  const { showToast } = useToast();

  const [report, setReport] = useState<MaintenanceReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!token || !reportId) return;
      if (!silent) setIsLoading(true);
      try {
        setReport(await reportsApi.getDetail(reportId, token));
      } catch (err) {
        if (!silent) showToast(err instanceof Error ? err.message : 'No se pudo cargar el reporte', 'error');
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token, reportId]
  );

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  const handleSend = async (body: string) => {
    if (!token || !reportId) return;
    await reportsApi.addMessage(reportId, body, token);
    await load(true);
  };

  const handleStatusChange = async (status: MaintenanceReportStatus) => {
    if (!token || !reportId || status === report?.status) return;
    setUpdatingStatus(true);
    try {
      const updated = await reportsApi.updateStatus(reportId, status, token);
      setReport((prev) => (prev ? { ...prev, ...updated } : updated));
      showToast('Estatus actualizado. Se notificó al inquilino.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al actualizar el estatus', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="ADMIN">
        {isLoading || !report ? (
          <p className="p-4 text-xs text-[#73777f]">{isLoading ? 'Cargando...' : 'No se encontró el reporte.'}</p>
        ) : (
          <ReportConversation
            report={report}
            viewerRole="ADMIN"
            onSend={handleSend}
            backHref={`/tenants/${tenantId}/profile`}
            backLabel={report.tenant?.fullName ?? 'Perfil del inquilino'}
            headerExtra={
              <div className="flex gap-2">
                {STATUS_ORDER.map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    disabled={updatingStatus || report.status === status}
                    className={`flex-1 font-sans text-label-sm font-semibold py-2 rounded-lg border transition-colors disabled:cursor-default ${
                      report.status === status
                        ? 'border-[#173a5f] bg-[#173a5f] text-white'
                        : 'border-[#c3c6cf]/40 bg-white text-[#173a5f] hover:bg-[#f7f3ea] disabled:opacity-40'
                    }`}
                  >
                    {maintenanceReportStatusLabels[status]}
                  </button>
                ))}
              </div>
            }
          />
        )}
    </ProtectedRoute>
  );
}
