'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { rentPaymentsApi, RentPayment } from '@/lib/api';
import { formatDate } from '@/lib/formatDate';
import { DetailHeader } from '@/components/StitchHeader';
import { useToast } from '@/components/ToastProvider';

export default function ReportsPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [filtered, setFiltered] = useState<RentPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [filters, setFilters] = useState({
    tenant: '',
    property: '',
    status: 'all' as string,
    type: 'all' as string,
  });

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    rentPaymentsApi.list(token)
      .then(setPayments)
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => {
    let result = payments;

    if (filters.tenant) {
      result = result.filter(p =>
        p.tenant?.fullName.toLowerCase().includes(filters.tenant.toLowerCase())
      );
    }

    if (filters.property) {
      result = result.filter(p =>
        p.property?.name.toLowerCase().includes(filters.property.toLowerCase())
      );
    }

    if (filters.status !== 'all') {
      result = result.filter(p => p.status === filters.status);
    }

    if (filters.type !== 'all') {
      result = result.filter(p => p.paymentType === filters.type);
    }

    setFiltered(result);
  }, [payments, filters]);

  const handleExportCSV = async () => {
    if (!token) return;
    setIsExporting(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/rent-payments/export/csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('No se pudo descargar el CSV');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pagos-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al descargar', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const now = new Date();
  const periodStart =
    period === 'month'
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : period === 'quarter'
        ? new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        : new Date(now.getFullYear(), 0, 1);
  const inPeriod = filtered.filter((p) => new Date(p.dueDate) >= periodStart && new Date(p.dueDate) <= now);
  const collected = inPeriod.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
  const pendingList = inPeriod.filter((p) => p.status !== 'PAID');
  const overdueList = inPeriod.filter((p) => p.status === 'OVERDUE');
  const pending = pendingList.reduce((sum, p) => sum + Number(p.amountDue) - Number(p.amountPaid || 0), 0);
  const overdue = overdueList.reduce((sum, p) => sum + Number(p.amountDue) - Number(p.amountPaid || 0), 0);
  const totalDue = inPeriod.reduce((sum, p) => sum + Number(p.amountDue), 0);
  const rate = totalDue > 0 ? Math.round((collected / totalDue) * 100) : 0;

  // Ingresos cobrados por mes (fecha de pago) en los últimos 6 meses.
  const months = Array.from({ length: 6 }, (_, k) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + k, 1);
    const total = payments
      .filter((p) => p.paidDate && new Date(p.paidDate).getFullYear() === d.getFullYear() && new Date(p.paidDate).getMonth() === d.getMonth())
      .reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
    return { label: d.toLocaleDateString('es-MX', { month: 'short' }).replace('.', ''), total };
  });
  const maxMonth = Math.max(1, ...months.map((m) => m.total));
  const sixTotal = months.reduce((sum, m) => sum + m.total, 0);
  const k = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toLocaleString('es-MX')}`);
  const money = (n: number) => `$${n.toLocaleString('es-MX')}`;

  const statusBadge: Record<string, string> = {
    PENDING: 'bg-[#FEF3C7] text-[#B45309]',
    PAID: 'bg-[#2D9E6B]/15 text-[#2D9E6B]',
    OVERDUE: 'bg-[#C0392B]/15 text-[#C0392B]',
  };
  const statusLabels: Record<string, string> = { PENDING: 'Pendiente', PAID: 'Pagado', OVERDUE: 'Vencido' };
  const kpi = 'bg-[#ffffff] p-3.5 rounded-lg border border-[#c3c6cf]/40 flex flex-col justify-between shadow-[0_1px_3px_rgba(23,58,95,0.05)]';
  const sel = 'w-full h-10 px-3 bg-white border border-[#A7B0BB]/40 rounded-lg text-xs text-[#173A5F] focus:outline-none focus:border-[#173A5F]';
  const hasFilters = filters.tenant || filters.property || filters.status !== 'all' || filters.type !== 'all';

  // Markup portado de Stitch: design/stitch/financial-reports.html
  return (
    <>
      <DetailHeader
        title="Reportes financieros"
        subtitle="Ingresos y cobranza en MXN"
        backHref="/settings"
        actions={
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            aria-label="Descargar CSV"
            className="p-1.5 rounded text-white hover:bg-[#002445] active:scale-95 transition-all disabled:opacity-50"
            type="button"
          >
            <span className="material-symbols-outlined text-[22px]">{isExporting ? 'hourglass_top' : 'download'}</span>
          </button>
        }
      />

      <main className="max-w-md sm:max-w-3xl mx-auto w-full px-4 pt-4 pb-24 sm:pb-8 space-y-4">
        {isLoading ? (
          <p className="text-xs text-[#73777f]">Cargando reportes...</p>
        ) : (
          <>
            <section className="bg-[#ffffff] p-3 rounded-lg border border-[#c3c6cf]/40 shadow-sm flex items-center justify-between gap-2">
              <div className="flex items-center space-x-1.5" role="tablist">
                {(
                  [
                    ['month', 'Mes'],
                    ['quarter', 'Trimestre'],
                    ['year', 'Año'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPeriod(key)}
                    className={
                      period === key
                        ? 'bg-[#173a5f] text-[#ffffff] font-sans text-label-md px-3 py-1.5 rounded-lg font-semibold transition-all'
                        : 'bg-[#f1eee5] text-[#43474e] font-sans text-label-md px-3 py-1.5 rounded-lg border border-[#c3c6cf]/30 hover:bg-[#e6e2d9] transition-all'
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 bg-[#f7f3ea] px-2.5 py-1.5 rounded-lg border border-[#c3c6cf]/40 text-[#173a5f]">
                <span className="font-sans text-label-sm font-semibold capitalize">
                  {now.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' }).replace('.', '')}
                </span>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3">
              <div className={kpi}>
                <div className="flex items-start justify-between">
                  <span className="font-sans text-label-sm text-[#43474e] font-medium">Ingresos cobrados</span>
                  <span className="material-symbols-outlined text-[#2D9E6B] text-[20px]">payments</span>
                </div>
                <div className="mt-2">
                  <span className="font-sans text-headline-sm font-bold text-[#173a5f] block tracking-tight">{money(collected)}</span>
                  <span className="inline-flex items-center text-[10px] font-semibold text-[#2D9E6B] bg-[#2D9E6B]/15 px-1.5 py-0.5 rounded-full mt-1">
                    {rate}% de lo esperado
                  </span>
                </div>
              </div>
              <div className={kpi}>
                <div className="flex items-start justify-between">
                  <span className="font-sans text-label-sm text-[#43474e] font-medium">Por cobrar</span>
                  <span className="material-symbols-outlined text-[#D9822B] text-[20px]">schedule</span>
                </div>
                <div className="mt-2">
                  <span className="font-sans text-headline-sm font-bold text-[#173a5f] block tracking-tight">{money(pending)}</span>
                  <span className="inline-flex items-center text-[10px] font-semibold text-[#D9822B] bg-[#D9822B]/15 px-1.5 py-0.5 rounded-full mt-1">
                    {pendingList.length} pagos
                  </span>
                </div>
              </div>
              <div className={kpi}>
                <div className="flex items-start justify-between">
                  <span className="font-sans text-label-sm text-[#43474e] font-medium">Vencido</span>
                  <span className="material-symbols-outlined text-[#C0392B] text-[20px]">warning</span>
                </div>
                <div className="mt-2">
                  <span className="font-sans text-headline-sm font-bold text-[#C0392B] block tracking-tight">{money(overdue)}</span>
                  <span className="inline-flex items-center text-[10px] font-semibold text-[#C0392B] bg-[#C0392B]/15 px-1.5 py-0.5 rounded-full mt-1">
                    {new Set(overdueList.map((p) => p.tenantId)).size} inquilinos
                  </span>
                </div>
              </div>
              <div className={kpi}>
                <div className="flex items-start justify-between">
                  <span className="font-sans text-label-sm text-[#43474e] font-medium">Esperado</span>
                  <span className="material-symbols-outlined text-[#173a5f] text-[20px]">account_balance</span>
                </div>
                <div className="mt-2">
                  <span className="font-sans text-headline-sm font-bold text-[#173a5f] block tracking-tight">{money(totalDue)}</span>
                  <span className="inline-flex items-center text-[10px] font-semibold text-[#173a5f] bg-[#173a5f]/10 px-1.5 py-0.5 rounded-full mt-1">
                    {inPeriod.length} pagos del periodo
                  </span>
                </div>
              </div>
            </section>

            <section className="bg-[#ffffff] p-4 rounded-lg border border-[#c3c6cf]/40 shadow-[0_1px_3px_rgba(23,58,95,0.05)]">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-sans text-label-lg font-semibold text-[#173a5f]">Evolución de Ingresos</h2>
                  <p className="font-sans text-body-sm text-[#73777f]">Últimos 6 meses (MXN)</p>
                </div>
                <span className="font-sans text-label-sm font-semibold text-[#2D9E6B] bg-[#2D9E6B]/10 px-2 py-0.5 rounded-full">{k(sixTotal)} Total</span>
              </div>
              <div className="h-40 flex items-end justify-between pt-6 pb-2 px-1 border-b border-[#ece8df] gap-2">
                {months.map((m, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <span className="font-sans text-[9px] text-[#73777f] mb-1 font-medium">{k(m.total)}</span>
                    <div
                      className={`w-full rounded-t transition-colors ${idx === months.length - 1 ? 'bg-[#2D9E6B]' : 'bg-[#A7B0BB]/30 group-hover:bg-[#A7B0BB]'}`}
                      style={{ height: `${Math.max(2, (m.total / maxMonth) * 75)}%` }}
                    ></div>
                    <span className="font-sans text-[10px] text-[#43474e] mt-2 font-medium capitalize">{m.label}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-[#ffffff] p-4 rounded-lg border border-[#c3c6cf]/40 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-sans text-label-lg font-semibold text-[#173a5f]">Detalle de pagos</h2>
                {hasFilters && (
                  <button
                    onClick={() => setFilters({ tenant: '', property: '', status: 'all', type: 'all' })}
                    className="text-[11px] font-semibold text-[#2D9E6B] hover:underline"
                    type="button"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Inquilino..." value={filters.tenant} onChange={(e) => setFilters({ ...filters, tenant: e.target.value })} className={sel} />
                <input placeholder="Propiedad..." value={filters.property} onChange={(e) => setFilters({ ...filters, property: e.target.value })} className={sel} />
                <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className={sel}>
                  <option value="all">Todos los estados</option>
                  <option value="PENDING">Pendiente</option>
                  <option value="PAID">Pagado</option>
                  <option value="OVERDUE">Vencido</option>
                </select>
                <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} className={sel}>
                  <option value="all">Todos los tipos</option>
                  <option value="RENT">Renta</option>
                  <option value="DEPOSIT">Depósito</option>
                  <option value="EXTRA">Extra</option>
                </select>
              </div>
              {inPeriod.length === 0 ? (
                <p className="text-xs text-[#73777f] text-center py-6">No hay pagos en este periodo con los filtros seleccionados.</p>
              ) : (
                <div className="divide-y divide-[#ece8df]">
                  {inPeriod.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2.5 gap-2">
                      <div className="min-w-0">
                        <p className="text-[0.8125rem] font-semibold text-[#173a5f] truncate">{p.tenant?.fullName}</p>
                        <p className="text-[0.6875rem] text-[#73777f] truncate">
                          {p.property?.name} · {formatDate(p.dueDate)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[0.8125rem] font-bold text-[#173a5f]">{money(Number(p.amountDue))}</p>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusBadge[p.status]}`}>{statusLabels[p.status]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
