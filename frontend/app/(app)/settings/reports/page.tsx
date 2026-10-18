'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { reportsApi, MaintenanceReport, MaintenanceReportStatus } from '@/lib/api';
import { DetailHeader } from '@/components/StitchHeader';
import { ReportCard, reportFolio } from '@/components/ReportCard';

type Filter = 'OPEN' | MaintenanceReportStatus | 'ALL';

// Listado global — la vía principal para llegar a la conversación de un tenant es
// desde su propio perfil (/tenants/[id]/profile → Reportes), pero este inbox sirve
// para ver de un vistazo qué necesita atención en todos los tenants a la vez.
// Markup portado de Stitch: design/stitch/reports-inbox.html
export default function ReportsInboxPage() {
  const { token } = useAuth();
  const [reports, setReports] = useState<MaintenanceReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('OPEN');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!token) return;
    reportsApi
      .list(token)
      .then(setReports)
      .finally(() => setIsLoading(false));
  }, [token]);

  const matches = (r: MaintenanceReport, f: Filter) =>
    f === 'ALL' ? true : f === 'OPEN' ? r.status !== 'CLOSED' : r.status === f;
  const pending = reports.filter((r) => r.status === 'REPORTED').length;
  const chips: { key: Filter; label: string }[] = [
    { key: 'OPEN', label: 'Abiertos' },
    { key: 'IN_PROGRESS', label: 'En progreso' },
    { key: 'CLOSED', label: 'Cerrados' },
    { key: 'ALL', label: 'Todos' },
  ];
  const q = query.trim().toLowerCase();
  const list = reports
    .filter((r) => matches(r, filter))
    .filter((r) => (q ? `${r.tenant?.fullName ?? ''} ${r.property?.name ?? ''} ${reportFolio(r)} ${r.description}`.toLowerCase().includes(q) : true));

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <DetailHeader title="Reportes de inquilinos" subtitle="Incidencias de todas las propiedades" backHref="/settings">
        <div className="flex items-center space-x-1 mt-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-[#D9822B]"></span>
          <span className="text-white font-medium">
            {pending} {pending === 1 ? 'pendiente' : 'pendientes'} de atención
          </span>
        </div>
      </DetailHeader>

      <div className="max-w-md sm:max-w-3xl mx-auto w-full pb-24 sm:pb-8">
        <section className="px-4 pt-4 pb-2 space-y-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#73777f] text-[20px]">search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-3 bg-[#ffffff] text-[#1c1c16] rounded-lg border border-[#A7B0BB]/30 text-body-md font-sans placeholder:text-[#73777f] focus:outline-none focus:border-[#173a5f] focus:ring-1 focus:ring-[#173a5f] transition-all"
              placeholder="Buscar por inquilino, propiedad o folio..."
              type="search"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {chips.map((c) => {
              const count = reports.filter((r) => matches(r, c.key)).length;
              return filter === c.key ? (
                <button key={c.key} onClick={() => setFilter(c.key)} className="flex-shrink-0 px-3.5 py-1.5 rounded-lg bg-[#173a5f] text-[#ffffff] text-label-md font-sans flex items-center gap-1.5" type="button">
                  <span>{c.label}</span>
                  <span className="px-1.5 rounded-full bg-[#2D9E6B] text-white text-[10px] font-bold">{count}</span>
                </button>
              ) : (
                <button key={c.key} onClick={() => setFilter(c.key)} className="flex-shrink-0 px-3.5 py-1.5 rounded-lg bg-[#ffffff] border border-[#A7B0BB]/40 text-[#173a5f] text-label-md font-sans flex items-center gap-1.5 hover:bg-[#f7f3ea] transition-colors" type="button">
                  <span>{c.label}</span>
                  <span className="px-1.5 rounded-full bg-[#F5F1E8] text-[#173A5F] text-[10px] font-semibold border border-[#A7B0BB]/30">{count}</span>
                </button>
              );
            })}
          </div>
        </section>

        <main className="px-4 py-2 space-y-3.5">
          {isLoading ? (
            <p className="text-xs text-[#73777f]">Cargando...</p>
          ) : list.length === 0 ? (
            <div className="bg-white rounded-lg border border-[#A7B0BB]/30 p-6 text-center">
              <span className="material-symbols-outlined text-[36px] text-[#A7B0BB]">inbox</span>
              <p className="text-xs text-[#73777f] mt-1">{reports.length === 0 ? 'No hay reportes todavía.' : 'Ningún reporte en este filtro.'}</p>
            </div>
          ) : (
            list.map((r) => <ReportCard key={r.id} report={r} href={`/tenants/${r.tenantId}/reports/${r.id}`} />)
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
