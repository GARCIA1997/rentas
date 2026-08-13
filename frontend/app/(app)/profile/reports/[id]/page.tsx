'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ReportConversation } from '@/components/ReportConversation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ToastProvider';
import { meApi, MaintenanceReport } from '@/lib/api';
import { ArrowLeftIcon } from '@/components/icons';

// Refresco ligero mientras la conversación está abierta — no es tiempo real (no hay
// WebSockets en esta app), pero evita que una respuesta del admin quede sin verse hasta
// recargar. El push ya avisa fuera de esta vista; esto sólo cubre "la tengo abierta".
const POLL_INTERVAL_MS = 15_000;

export default function TenantReportDetailPage() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useParams();
  const reportId = params?.id as string;
  const { showToast } = useToast();

  const [report, setReport] = useState<MaintenanceReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(
    async (silent = false) => {
      if (!token || !reportId) return;
      if (!silent) setIsLoading(true);
      try {
        setReport(await meApi.getMyReportDetail(reportId, token));
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
    await meApi.addMyReportMessage(reportId, body, token);
    await load(true);
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-[calc(100dvh-env(safe-area-inset-top)-4.5rem)] sm:h-[calc(100vh-6rem)]">
        <button
          onClick={() => router.push('/profile')}
          className="flex items-center gap-1.5 text-muted hover:text-heading text-sm mb-4 -ml-1 shrink-0"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Mis reportes
        </button>

        {isLoading ? (
          <p className="text-muted">Cargando...</p>
        ) : !report ? (
          <p className="text-muted">No se encontró el reporte.</p>
        ) : (
          <ReportConversation report={report} viewerRole="INQUILINO" onSend={handleSend} />
        )}
      </div>
    </ProtectedRoute>
  );
}
