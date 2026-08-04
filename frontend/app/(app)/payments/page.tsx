'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PayPaymentModal } from '@/components/PayPaymentModal';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';
import {
  rentPaymentsApi,
  buildWhatsAppReminderUrl,
  shareReceiptOnWhatsApp,
  getPendingPayments,
  paymentTypeLabels,
  RentPayment,
} from '@/lib/api';
import { formatDate } from '@/lib/formatDate';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { BellIcon, BanknoteIcon, DownloadIcon, UndoIcon } from '@/components/icons';

export default function PaymentsPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterProperty, setFilterProperty] = useState('');
  const [filterTenant, setFilterTenant] = useState('');
  const [segment, setSegment] = useState<'due' | 'paid'>('due');

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

  const handleReminder = (payment: RentPayment) => {
    window.open(buildWhatsAppReminderUrl(payment), '_blank');
  };

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
    const confirmed = await confirm('¿Revertir este pago? Volverá a marcarse como no pagado y podrá registrarse de nuevo.');
    if (!confirmed) return;
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

  const matchesFilters = useCallback(
    (p: RentPayment) => {
      if (filterProperty && !p.property?.name.toLowerCase().includes(filterProperty.toLowerCase())) return false;
      if (filterTenant && !p.tenant?.fullName.toLowerCase().includes(filterTenant.toLowerCase())) return false;
      return true;
    },
    [filterProperty, filterTenant]
  );

  const duePayments = useMemo(() => getPendingPayments(payments), [payments]);
  const paidHistory = useMemo(
    () =>
      payments
        .filter((p) => p.status === 'PAID')
        .sort((a, b) => new Date(b.paidDate ?? b.dueDate).getTime() - new Date(a.paidDate ?? a.dueDate).getTime()),
    [payments]
  );

  const filteredDue = useMemo(() => duePayments.filter(matchesFilters), [duePayments, matchesFilters]);
  const filteredPaid = useMemo(() => paidHistory.filter(matchesFilters), [paidHistory, matchesFilters]);

  const overdueTotal = useMemo(
    () => filteredDue.filter((p) => p.status === 'OVERDUE').reduce((sum, p) => sum + Number(p.amountDue), 0),
    [filteredDue]
  );
  const scheduledTotal = useMemo(() => filteredDue.reduce((sum, p) => sum + Number(p.amountDue), 0), [filteredDue]);

  const listToShow = segment === 'due' ? filteredDue : filteredPaid;

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-heading mb-1">Pagos</h1>
            <p className="text-muted">Todos los pagos programados y cobrados</p>
          </div>
          <Link href="/reports" className="text-primary text-sm font-medium hover:underline">
            Ver reporte completo →
          </Link>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl shadow-sm p-4 border border-red-200 dark:border-red-800">
            <p className="text-muted text-xs mb-1">Vencido</p>
            <p className="text-heading font-bold text-xl">${overdueTotal.toLocaleString('es-MX')}</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl shadow-sm p-4 border border-amber-200 dark:border-amber-800">
            <p className="text-muted text-xs mb-1">Total programado</p>
            <p className="text-heading font-bold text-xl">${scheduledTotal.toLocaleString('es-MX')}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-surface rounded-2xl shadow-sm p-5 space-y-3">
          <h3 className="text-heading font-semibold text-sm">Filtros</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Filtrar por propiedad..."
              value={filterProperty}
              onChange={(e) => setFilterProperty(e.target.value)}
              className="px-3 py-2.5 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
            <input
              type="text"
              placeholder="Filtrar por inquilino..."
              value={filterTenant}
              onChange={(e) => setFilterTenant(e.target.value)}
              className="px-3 py-2.5 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>
          {(filterProperty || filterTenant) && (
            <button
              onClick={() => {
                setFilterProperty('');
                setFilterTenant('');
              }}
              className="text-sm text-muted hover:text-heading"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-800 dark:text-red-400">
            {error}
          </div>
        )}

        {isLoading ? (
          <LoadingSpinner message="Cargando pagos..." />
        ) : (
          <div className="bg-surface rounded-2xl shadow-sm p-5">
            {/* Segmented control */}
            <div className="flex bg-canvas rounded-xl p-1 mb-4">
              <button
                onClick={() => setSegment('due')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  segment === 'due' ? 'bg-surface shadow-sm text-heading' : 'text-muted'
                }`}
              >
                Programados {filteredDue.length > 0 && `(${filteredDue.length})`}
              </button>
              <button
                onClick={() => setSegment('paid')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  segment === 'paid' ? 'bg-surface shadow-sm text-heading' : 'text-muted'
                }`}
              >
                Pagados {filteredPaid.length > 0 && `(${filteredPaid.length})`}
              </button>
            </div>

            {listToShow.length === 0 ? (
              <p className="text-muted text-sm text-center py-10">
                {segment === 'due'
                  ? duePayments.length === 0
                    ? 'No hay pagos programados. ¡Todo al corriente!'
                    : 'No hay resultados con los filtros seleccionados.'
                  : paidHistory.length === 0
                    ? 'Aún no hay pagos registrados.'
                    : 'No hay resultados con los filtros seleccionados.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {listToShow.map((payment) => {
                  const isOverdue = payment.status === 'OVERDUE';
                  const remaining = Number(payment.amountDue) - Number(payment.amountPaid || 0);
                  return (
                    <div key={payment.id} className="bg-canvas rounded-xl p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-heading font-semibold text-sm truncate">{payment.tenant?.fullName ?? '—'}</p>
                          <p className="text-muted text-xs truncate">{payment.property?.name ?? '—'}</p>
                        </div>
                        <span
                          className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                            segment === 'due'
                              ? isOverdue
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                          }`}
                        >
                          {segment === 'due' ? (isOverdue ? 'Vencido' : 'Próximo') : 'Pagado'}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-muted flex items-center gap-1.5">
                            Monto
                            {payment.paymentType && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-black/5 dark:bg-white/10 text-muted">
                                {paymentTypeLabels[payment.paymentType]}
                              </span>
                            )}
                          </span>
                          <span className="text-heading font-medium">${Number(payment.amountDue).toLocaleString('es-MX')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted">{segment === 'due' ? 'Vencimiento' : 'Pagado el'}</span>
                          <span className="text-heading font-medium">
                            {formatDate(segment === 'due' ? payment.dueDate : payment.paidDate ?? payment.dueDate)}
                          </span>
                        </div>
                        {payment.paymentNumber && payment.totalPaymentsInContract && (
                          <div className="flex justify-between">
                            <span className="text-muted">Número</span>
                            <span className="text-heading font-medium">
                              {payment.paymentNumber}/{payment.totalPaymentsInContract}
                            </span>
                          </div>
                        )}
                        {segment === 'due' && Number(payment.amountPaid) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted">Abonado</span>
                            <span className="text-heading font-medium">${Number(payment.amountPaid).toLocaleString('es-MX')}</span>
                          </div>
                        )}
                      </div>

                      {segment === 'due' ? (
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => handleReminder(payment)}
                            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg border border-black/10 dark:border-white/10 text-muted hover:text-heading hover:bg-surface transition-colors"
                          >
                            <BellIcon className="w-3.5 h-3.5" />
                            Recordatorio
                          </button>
                          <button
                            onClick={() => setPayTarget(payment)}
                            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg bg-primary text-white hover:bg-primary-pressed transition-colors"
                          >
                            <BanknoteIcon className="w-3.5 h-3.5" />
                            Pagar {remaining < Number(payment.amountDue) && `($${remaining.toLocaleString('es-MX')})`}
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => handleDownloadReceipt(payment)}
                            className="flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-3 rounded-lg border border-black/10 dark:border-white/10 text-muted hover:text-heading hover:bg-surface transition-colors"
                            aria-label="Descargar recibo"
                          >
                            <DownloadIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleShareReceipt(payment)}
                            disabled={sharingId === payment.id}
                            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg bg-primary text-white hover:bg-primary-pressed transition-colors disabled:opacity-50"
                          >
                            {sharingId === payment.id ? 'Enviando...' : 'Enviar recibo'}
                          </button>
                          <button
                            onClick={() => handleRevertPayment(payment)}
                            disabled={revertingId === payment.id}
                            className="flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-3 rounded-lg border border-black/10 dark:border-white/10 text-muted hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 transition-colors disabled:opacity-50"
                            aria-label="Revertir pago"
                            title="Revertir pago"
                          >
                            <UndoIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <PayPaymentModal
        payment={payTarget}
        isOpen={!!payTarget}
        onClose={() => setPayTarget(null)}
        onPaid={() => loadPayments({ silent: true })}
      />
    </ProtectedRoute>
  );
}
