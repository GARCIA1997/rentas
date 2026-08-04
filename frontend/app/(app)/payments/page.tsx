'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { rentPaymentsApi, RentPayment } from '@/lib/api';
import { formatDate } from '@/lib/formatDate';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const paymentMethodLabels: Record<RentPayment['paymentMethod'], string> = {
  MANUAL: 'Manual',
  TRANSFERENCIA: 'Transferencia',
  EFECTIVO: 'Efectivo',
  CHEQUE: 'Cheque',
};

export default function PaymentsPage() {
  const { token } = useAuth();
  const [overduePayments, setOverduePayments] = useState<RentPayment[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<RentPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [filterProperty, setFilterProperty] = useState('');
  const [filterTenant, setFilterTenant] = useState('');

  const loadPayments = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError('');
    try {
      const [overdue, upcoming] = await Promise.all([
        rentPaymentsApi.getOverdue(token),
        rentPaymentsApi.getUpcoming(token, 7),
      ]);
      setOverduePayments(overdue);
      setUpcomingPayments(upcoming);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar pagos');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const handleMarkPaid = useCallback(async (paymentId: string) => {
    if (!token) return;
    setActionLoadingId(paymentId);
    try {
      await rentPaymentsApi.markPaid(paymentId, 'TRANSFERENCIA', token);
      await loadPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al marcar como pagado');
    } finally {
      setActionLoadingId(null);
    }
  }, [token, loadPayments]);

  const handleDownloadReceipt = useCallback(async (paymentId: string) => {
    if (!token) return;
    try {
      await rentPaymentsApi.downloadReceipt(paymentId, token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al descargar recibo');
    }
  }, [token]);

  const filteredOverdue = useMemo(() => overduePayments.filter((p) => {
    if (filterProperty && !p.property?.name.toLowerCase().includes(filterProperty.toLowerCase())) return false;
    if (filterTenant && !p.tenant?.fullName.toLowerCase().includes(filterTenant.toLowerCase())) return false;
    return true;
  }), [overduePayments, filterProperty, filterTenant]);

  const filteredUpcoming = useMemo(() => upcomingPayments.filter((p) => {
    if (filterProperty && !p.property?.name.toLowerCase().includes(filterProperty.toLowerCase())) return false;
    if (filterTenant && !p.tenant?.fullName.toLowerCase().includes(filterTenant.toLowerCase())) return false;
    return true;
  }), [upcomingPayments, filterProperty, filterTenant]);

  const PaymentCard = ({ payment, isOverdue }: { payment: RentPayment; isOverdue: boolean }) => (
    <div className="bg-surface rounded-xl shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-heading font-semibold text-sm truncate">{payment.tenant?.fullName ?? '—'}</p>
          <p className="text-muted text-xs truncate">{payment.property?.name ?? '—'}</p>
        </div>
        <span
          className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ml-2 ${
            isOverdue ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
          }`}
        >
          {isOverdue ? 'Vencido' : 'Próximo'}
        </span>
      </div>

      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Monto</span>
          <span className="text-heading font-medium">${Number(payment.amountDue).toLocaleString('es-MX')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Vencimiento</span>
          <span className="text-heading font-medium">{formatDate(payment.dueDate)}</span>
        </div>
        {payment.paymentNumber && payment.totalPaymentsInContract && (
          <div className="flex justify-between">
            <span className="text-muted">Número</span>
            <span className="text-heading font-medium">
              {payment.paymentNumber}/{payment.totalPaymentsInContract}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={() => handleMarkPaid(payment.id)}
          disabled={actionLoadingId === payment.id}
          className="flex-1 text-sm font-medium py-2 rounded-lg bg-primary text-white hover:bg-primary-pressed disabled:opacity-50 transition-colors"
        >
          {actionLoadingId === payment.id ? 'Marcando...' : 'Marcar pagado'}
        </button>
        {payment.status === 'PAID' && (
          <button
            onClick={() => handleDownloadReceipt(payment.id)}
            className="flex-1 text-sm font-medium py-2 rounded-lg border border-primary text-primary hover:bg-primary/5 transition-colors"
          >
            Recibo
          </button>
        )}
      </div>
    </div>
  );

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-heading mb-1">Pagos</h1>
            <p className="text-muted">Monitorea pagos vencidos y próximos a vencer</p>
          </div>
          <Link href="/reports" className="text-primary text-sm font-medium hover:underline">
            Ver reporte completo →
          </Link>
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
          <>
            {/* Overdue section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-red-600 rounded-full"></div>
                <h2 className="text-lg font-bold text-heading">
                  Vencidos ({filteredOverdue.length} de {overduePayments.length})
                </h2>
              </div>

              {filteredOverdue.length === 0 ? (
                <p className="text-muted text-sm py-6 text-center bg-surface rounded-lg">
                  {overduePayments.length === 0 ? 'No hay pagos vencidos. ¡Excelente!' : 'No hay resultados con los filtros seleccionados.'}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredOverdue.map((payment) => (
                    <PaymentCard key={payment.id} payment={payment} isOverdue={true} />
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-amber-600 rounded-full"></div>
                <h2 className="text-lg font-bold text-heading">
                  Próximos (próximos 7 días: {filteredUpcoming.length} de {upcomingPayments.length})
                </h2>
              </div>

              {filteredUpcoming.length === 0 ? (
                <p className="text-muted text-sm py-6 text-center bg-surface rounded-lg">
                  {upcomingPayments.length === 0 ? 'No hay pagos próximos en los próximos 7 días.' : 'No hay resultados con los filtros seleccionados.'}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredUpcoming.map((payment) => (
                    <PaymentCard key={payment.id} payment={payment} isOverdue={false} />
                  ))}
                </div>
              )}
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-3 pt-4">
              <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-4 border border-red-200 dark:border-red-800">
                <p className="text-muted text-xs mb-1">Total vencido</p>
                <p className="text-heading font-bold text-xl">
                  ${filteredOverdue.reduce((sum, p) => sum + Number(p.amountDue), 0).toLocaleString('es-MX')}
                </p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                <p className="text-muted text-xs mb-1">Total próximo</p>
                <p className="text-heading font-bold text-xl">
                  ${filteredUpcoming.reduce((sum, p) => sum + Number(p.amountDue), 0).toLocaleString('es-MX')}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
