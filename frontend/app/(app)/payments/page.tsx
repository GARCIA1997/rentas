'use client';

// Markup portado de Stitch: design/stitch/payments.html ("Listado de Pagos").
import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PayPaymentModal } from '@/components/PayPaymentModal';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';
import { rentPaymentsApi, buildWhatsAppReminderUrl, shareReceiptOnWhatsApp, paymentTypeLabels, RentPayment } from '@/lib/api';
import { formatDate } from '@/lib/formatDate';
import { MainHeader } from '@/components/StitchHeader';

type Segment = 'overdue' | 'upcoming' | 'paid';
const money = (n: number | string) => `$${Number(n).toLocaleString('es-MX')}`;
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
const isActiveContract = (p: RentPayment) => p.contract?.status !== 'CANCELLED' && p.contract?.status !== 'EXPIRED';

export default function PaymentsPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [segment, setSegment] = useState<Segment>('upcoming');
  const [query, setQuery] = useState('');
  const [payTarget, setPayTarget] = useState<RentPayment | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [revertingId, setRevertingId] = useState<string | null>(null);

  const loadPayments = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!token) return;
      if (!options?.silent) setIsLoading(true);
      setError('');
      try {
        setPayments(await rentPaymentsApi.list(token));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar pagos');
      } finally {
        if (!options?.silent) setIsLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const handleShareReceipt = async (payment: RentPayment) => {
    if (!token) return;
    setSharingId(payment.id);
    try {
      const result = await shareReceiptOnWhatsApp(payment, token);
      if (result === 'fallback') {
        showToast('El recibo se descargó — adjúntalo manualmente en la conversación de WhatsApp que se abrió.', 'info');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al compartir el recibo', 'error');
    } finally {
      setSharingId(null);
    }
  };

  const handleDownloadReceipt = async (payment: RentPayment) => {
    if (!token) return;
    try {
      await rentPaymentsApi.downloadReceipt(payment.id, token);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al descargar el recibo', 'error');
    }
  };

  const handleRevertPayment = async (payment: RentPayment) => {
    if (!token) return;
    const ok = await confirm({
      title: 'Revertir pago',
      message: `¿Revertir el pago de ${money(payment.amountDue)}? Volverá a marcarse como pendiente y podrá registrarse de nuevo.`,
      confirmLabel: 'Revertir',
    });
    if (!ok) return;
    setRevertingId(payment.id);
    try {
      await rentPaymentsApi.update(payment.id, { amountPaid: 0, paidDate: null }, token);
      await loadPayments({ silent: true });
      showToast('Pago revertido.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al revertir el pago', 'error');
    } finally {
      setRevertingId(null);
    }
  };

  const overdue = useMemo(
    () => payments.filter((p) => p.status === 'OVERDUE' && isActiveContract(p)).sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate)),
    [payments]
  );
  const upcoming = useMemo(
    () => payments.filter((p) => p.status === 'PENDING' && isActiveContract(p)).sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate)),
    [payments]
  );
  const paid = useMemo(
    () => payments.filter((p) => p.status === 'PAID').sort((a, b) => +new Date(b.paidDate ?? b.dueDate) - +new Date(a.paidDate ?? a.dueDate)),
    [payments]
  );

  // Recaudación del mes en curso: lo cobrado vs. lo que vence este mes.
  const monthStats = useMemo(() => {
    const now = new Date();
    const inMonth = payments.filter((p) => {
      const d = new Date(p.dueDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && isActiveContract(p);
    });
    const expected = inMonth.reduce((s, p) => s + Number(p.amountDue), 0);
    const collected = inMonth.reduce((s, p) => s + Number(p.amountPaid || 0), 0);
    return { expected, collected, pct: expected > 0 ? Math.min(100, Math.round((collected / expected) * 100)) : 0, label: `${MONTHS[now.getMonth()]} ${now.getFullYear()}` };
  }, [payments]);

  const source = segment === 'overdue' ? overdue : segment === 'upcoming' ? upcoming : paid;
  const q = query.trim().toLowerCase();
  const list = q
    ? source.filter((p) => `${p.tenant?.fullName ?? ''} ${p.property?.name ?? ''}`.toLowerCase().includes(q))
    : source;

  const tabs: { key: Segment; label: string; count: number; badge: string }[] = [
    { key: 'overdue', label: 'Vencidos', count: overdue.length, badge: 'bg-[#FEE2E2] text-[#DC2626]' },
    { key: 'upcoming', label: 'Próximos', count: upcoming.length, badge: 'bg-[#2D9E6B] text-white' },
    { key: 'paid', label: 'Pagados', count: paid.length, badge: 'bg-[#F5F1E8] text-[#173A5F]' },
  ];

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <MainHeader>
        {/* Título de sección */}
        <div className="mt-4 sm:mt-0">
          <div className="flex items-center justify-between">
            <h1 className="font-sans text-xl font-bold text-white tracking-tight">Gestión de Pagos</h1>
            <span className="text-[11px] font-medium bg-white/10 text-white/90 px-2 py-0.5 rounded-[8px] border border-white/15">{monthStats.label}</span>
          </div>
        </div>
        {/* Métrica de Recaudación Mensual */}
        <div className="mt-3.5 bg-white/10 border border-white/15 rounded-[8px] p-3">
          <div className="flex justify-between items-baseline text-xs mb-1.5">
            <span className="text-white/80 font-medium">Recaudación del mes</span>
            <span className="font-sans font-bold text-white text-sm">
              {money(monthStats.collected)} <span className="text-white/60 text-xs font-normal">/ {money(monthStats.expected)} MXN</span>
            </span>
          </div>
          <div className="w-full bg-white/20 h-2 rounded-[8px] overflow-hidden flex">
            <div className="bg-[#2D9E6B] h-full rounded-[8px] transition-all duration-500" style={{ width: `${monthStats.pct}%` }}></div>
          </div>
          <div className="flex justify-between items-center mt-2 text-[11px] text-white/70">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2D9E6B]"></span> {monthStats.pct}% cubierto
            </span>
            <span className="text-white/90 font-medium">Faltan {money(Math.max(0, monthStats.expected - monthStats.collected))}</span>
          </div>
        </div>
        {/* Buscador */}
        <div className="mt-3.5 flex gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#A7B0BB] text-[18px]">search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-white text-[#173A5F] placeholder-[#A7B0BB] text-xs font-medium pl-9 pr-3 py-2.5 rounded-[8px] border-0 focus:ring-2 focus:ring-[#2D9E6B] shadow-none outline-none"
              placeholder="Buscar por inquilino o propiedad..."
              type="text"
            />
          </div>
          <Link
            href="/reports"
            className="bg-[#2D9E6B] hover:opacity-90 active:scale-95 transition text-white px-3 py-2 rounded-[8px] flex items-center justify-center flex-shrink-0"
            title="Reportes financieros"
          >
            <span className="material-symbols-outlined text-[19px]">tune</span>
          </Link>
        </div>
      </MainHeader>

      <main className="flex-1 px-4 pt-4 pb-6 space-y-4 max-w-md sm:max-w-5xl mx-auto w-full">
        {/* PESTAÑAS */}
        <nav aria-label="Filtro de estados de pago" className="bg-white p-1 rounded-[8px] border border-[#E2E8F0] flex gap-1 shadow-none">
          {tabs.map((t) =>
            segment === t.key ? (
              <button
                key={t.key}
                onClick={() => setSegment(t.key)}
                className="flex-1 py-1.5 px-2 text-center text-xs font-bold rounded-[8px] bg-[#173A5F] text-white shadow-none flex items-center justify-center gap-1"
              >
                {t.label}
                <span className="px-1.5 bg-[#2D9E6B] text-white font-bold rounded-[8px] text-[10px]">{t.count}</span>
              </button>
            ) : (
              <button
                key={t.key}
                onClick={() => setSegment(t.key)}
                className="flex-1 py-1.5 px-2 text-center text-xs font-medium rounded-[8px] text-[#173A5F] hover:bg-[#F5F1E8] transition-colors flex items-center justify-center gap-1"
              >
                {t.label}
                <span className={`px-1.5 font-bold rounded-[8px] text-[10px] ${t.badge}`}>{t.count}</span>
              </button>
            )
          )}
        </nav>

        {error && <div className="bg-[#FEE2E2] border border-[#FECACA] rounded-[8px] p-3 text-xs text-[#DC2626]">{error}</div>}

        {isLoading ? (
          <p className="text-xs text-[#A7B0BB]">Cargando pagos...</p>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-[8px] p-6 border border-[#E2E8F0] text-center text-xs text-[#A7B0BB]">
            {segment === 'overdue' ? 'Sin pagos vencidos.' : segment === 'upcoming' ? 'No hay pagos próximos.' : 'Aún no hay pagos registrados.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {list.map((p) => {
              const isOverdue = p.status === 'OVERDUE';
              const isPaid = p.status === 'PAID';
              const remaining = Number(p.amountDue) - Number(p.amountPaid || 0);
              const folio = p.paymentNumber ? `${p.paymentNumber}/${p.totalPaymentsInContract}` : p.paymentType ? paymentTypeLabels[p.paymentType] : '—';
              return (
                <article
                  key={p.id}
                  className={`bg-white rounded-[8px] p-3.5 border shadow-none relative overflow-hidden ${isOverdue ? 'border-[#FECACA]' : 'border-[#E2E8F0]'}`}
                >
                  {isOverdue && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#DC2626]"></div>}
                  <div className={`flex items-start justify-between gap-2 ${isOverdue ? 'pl-1' : ''}`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="material-symbols-outlined text-[#173A5F] text-[16px]">apartment</span>
                        <h3 className="font-sans font-bold text-sm text-[#173A5F] truncate">{p.property?.name ?? '—'}</h3>
                      </div>
                      <p className="text-xs text-[#A7B0BB] flex items-center gap-1 font-medium">
                        <span className="material-symbols-outlined text-[14px]">person</span>
                        {p.tenant?.fullName ?? '—'}
                      </p>
                    </div>
                    {isPaid ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-[8px] text-[10px] font-bold bg-[#DCFCE7] text-[#2D9E6B] border border-[#BBF7D0] shrink-0">
                        <span className="material-symbols-outlined text-[12px] mr-0.5">check</span>
                        Pagado ({formatDate(p.paidDate ?? p.dueDate)})
                      </span>
                    ) : isOverdue ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-[8px] text-[10px] font-bold bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA] shrink-0">
                        Vencido hace {daysSince(p.dueDate)} días
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-[8px] text-[10px] font-semibold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] shrink-0">
                        Vence: {formatDate(p.dueDate)}
                      </span>
                    )}
                  </div>

                  <div className={`mt-3 pt-2.5 border-t border-[#F5F1E8] flex items-center justify-between ${isOverdue ? 'pl-1' : ''}`}>
                    <div>
                      <span className="text-[10px] text-[#A7B0BB] uppercase font-semibold tracking-wider block">Pago</span>
                      <span className="text-xs font-mono font-medium text-[#173A5F]">{folio}</span>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-[10px] uppercase font-semibold tracking-wider block ${
                          isPaid ? 'text-[#2D9E6B]' : isOverdue ? 'text-[#DC2626]' : 'text-[#A7B0BB]'
                        }`}
                      >
                        {isPaid ? 'Liquidado' : Number(p.amountPaid) > 0 ? `Abonado ${money(p.amountPaid)}` : 'Monto renta'}
                      </span>
                      <span className={`font-sans text-base font-bold ${isPaid ? 'text-[#2D9E6B]' : isOverdue ? 'text-[#DC2626]' : 'text-[#173A5F]'}`}>
                        {money(p.amountDue)} <span className="text-xs font-medium text-[#A7B0BB]">MXN</span>
                      </span>
                    </div>
                  </div>

                  {isPaid ? (
                    <div className="mt-3 pt-1 grid grid-cols-[auto_1fr_auto] gap-2">
                      <button
                        onClick={() => handleDownloadReceipt(p)}
                        aria-label="Descargar recibo"
                        className="py-2 px-3 rounded-[8px] border border-[#E2E8F0] bg-[#F5F1E8]/50 hover:bg-[#F5F1E8] text-[#173A5F] active:scale-95 transition text-xs font-medium flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined text-[16px]">download</span>
                      </button>
                      <button
                        onClick={() => handleShareReceipt(p)}
                        disabled={sharingId === p.id}
                        className="w-full py-2 px-3 rounded-[8px] border border-[#E2E8F0] bg-[#F5F1E8]/50 hover:bg-[#F5F1E8] text-[#173A5F] active:scale-95 transition text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                        {sharingId === p.id ? 'Enviando...' : 'Enviar recibo'}
                      </button>
                      <button
                        onClick={() => handleRevertPayment(p)}
                        disabled={revertingId === p.id}
                        aria-label="Revertir pago"
                        title="Revertir pago"
                        className="py-2 px-3 rounded-[8px] border border-[#E2E8F0] bg-white text-[#D97706] hover:bg-[#FEF3C7] active:scale-95 transition text-xs flex items-center justify-center disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[16px]">undo</span>
                      </button>
                    </div>
                  ) : (
                    <div className={`mt-3 grid grid-cols-2 gap-2 pt-1 ${isOverdue ? 'pl-1' : ''}`}>
                      {isOverdue ? (
                        <button
                          onClick={() => window.open(buildWhatsAppReminderUrl(p), '_blank')}
                          className="w-full py-2 px-2.5 rounded-[8px] border border-[#DC2626] bg-white text-[#DC2626] hover:bg-[#FEE2E2]/30 active:scale-95 transition text-xs font-semibold flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[16px]">campaign</span>
                          Reclamar cobro
                        </button>
                      ) : (
                        <button
                          onClick={() => window.open(buildWhatsAppReminderUrl(p), '_blank')}
                          className="w-full py-2 px-2.5 rounded-[8px] border border-[#A7B0BB]/60 bg-white text-[#173A5F] hover:bg-[#F5F1E8] active:scale-95 transition text-xs font-semibold flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[16px]">send</span>
                          Recordatorio
                        </button>
                      )}
                      <button
                        onClick={() => setPayTarget(p)}
                        className="w-full py-2 px-2.5 rounded-[8px] bg-[#2D9E6B] hover:opacity-95 text-white active:scale-95 transition text-xs font-bold flex items-center justify-center gap-1.5 shadow-none"
                      >
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        Registrar pago{remaining < Number(p.amountDue) ? ` (${money(remaining)})` : ''}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* BANNER DE REPORTES */}
        <section className="bg-white rounded-[8px] p-3.5 border border-[#E2E8F0] flex items-center justify-between gap-3 shadow-none">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[8px] bg-[#173A5F]/10 text-[#173A5F] flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[20px]">table_chart</span>
            </div>
            <div>
              <h4 className="font-sans font-bold text-xs text-[#173A5F]">Reporte contable mensual</h4>
              <p className="text-[11px] text-[#A7B0BB]">Ingresos, por cobrar y exportación CSV</p>
            </div>
          </div>
          <Link
            href="/reports"
            className="bg-[#173A5F] hover:bg-[#122c48] active:scale-95 transition text-white text-xs font-semibold px-2.5 py-1.5 rounded-[8px] flex items-center gap-1 flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[15px]">download</span>
            Exportar
          </Link>
        </section>
      </main>

      <PayPaymentModal payment={payTarget} isOpen={!!payTarget} onClose={() => setPayTarget(null)} onPaid={() => loadPayments({ silent: true })} />
    </ProtectedRoute>
  );
}
