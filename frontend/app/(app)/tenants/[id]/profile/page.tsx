'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { TenantFormModal } from '@/components/TenantFormModal';
import { PayPaymentModal } from '@/components/PayPaymentModal';
import { useAuth } from '@/hooks/useAuth';
import {
  tenantsApi,
  contractsApi,
  rentPaymentsApi,
  buildWhatsAppReminderUrl,
  shareReceiptOnWhatsApp,
  Tenant,
  Contract,
  RentPayment,
} from '@/lib/api';
import { formatDate } from '@/lib/formatDate';
import { ArrowLeftIcon, PencilIcon, TrashIcon, BellIcon, BanknoteIcon, DownloadIcon } from '@/components/icons';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-black/5 dark:border-white/10 last:border-0 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-heading font-medium text-right">{value}</span>
    </div>
  );
}

const DAYS_AHEAD = 7;

export default function TenantProfilePage() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tenantId = params?.id as string;

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [segment, setSegment] = useState<'due' | 'paid'>('due');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [payTarget, setPayTarget] = useState<RentPayment | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !tenantId) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tenantId]);

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [tenantData, contractsData, paymentsData] = await Promise.all([
        tenantsApi.get(tenantId, token!),
        contractsApi.list(token!),
        rentPaymentsApi.list(token!),
      ]);
      setTenant(tenantData);
      setContracts(contractsData.filter((c) => c.tenantId === tenantId));
      setPayments(paymentsData.filter((p) => p.tenantId === tenantId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !tenant) return;
    if (!confirm(`¿Eliminar a ${tenant.fullName}? Esta acción no se puede deshacer.`)) return;
    setIsDeleting(true);
    try {
      await tenantsApi.remove(tenant.id, token);
      router.push('/tenants');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
      setIsDeleting(false);
    }
  };

  const handleReminder = (payment: RentPayment) => {
    window.open(buildWhatsAppReminderUrl(payment), '_blank');
  };

  const handleShareReceipt = async (payment: RentPayment) => {
    if (!token) return;
    setSharingId(payment.id);
    try {
      const result = await shareReceiptOnWhatsApp(payment, token);
      if (result === 'fallback') {
        alert('El recibo se descargó — adjúntalo manualmente en la conversación de WhatsApp que se abrió.');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al compartir el recibo');
    } finally {
      setSharingId(null);
    }
  };

  const handleDownloadReceipt = async (payment: RentPayment) => {
    if (!token) return;
    try {
      await rentPaymentsApi.downloadReceipt(payment.id, token);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al descargar el recibo');
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute requiredRole="ADMIN">
        <p className="text-muted">Cargando...</p>
      </ProtectedRoute>
    );
  }

  if (!tenant) {
    return (
      <ProtectedRoute requiredRole="ADMIN">
        <div className="space-y-4">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-muted hover:text-heading text-sm -ml-1">
            <ArrowLeftIcon className="w-4 h-4" />
            Atrás
          </button>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-400 text-sm">{error || 'No se pudo cargar el inquilino'}</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const activeContract = contracts.find((c) => c.status === 'ACTIVE');

  const paidPayments = payments.filter((p) => p.status === 'PAID');
  const punctualPayments = paidPayments.filter((p) => p.paidDate && new Date(p.paidDate) <= new Date(p.dueDate));
  const punctualityPercent = paidPayments.length > 0 ? Math.round((punctualPayments.length / paidPayments.length) * 100) : 0;

  const now = new Date();
  const upcomingLimit = new Date(now.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000);
  const duePayments = getDuePayments(payments, now, upcomingLimit);
  const paidHistory = [...paidPayments].sort((a, b) => new Date(b.paidDate ?? b.dueDate).getTime() - new Date(a.paidDate ?? a.dueDate).getTime());

  const listToShow = segment === 'due' ? duePayments : paidHistory;

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className="space-y-6">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-muted hover:text-heading text-sm -ml-1">
          <ArrowLeftIcon className="w-4 h-4" />
          Volver
        </button>

        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-heading">{tenant.fullName}</h1>
            <p className="text-muted text-sm">Perfil del inquilino</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsEditOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-surface shadow-sm text-muted hover:text-primary transition-colors"
              aria-label="Editar"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-surface shadow-sm text-muted hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
              aria-label="Eliminar"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-800 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="bg-surface rounded-2xl shadow-sm p-5">
          <h3 className="text-heading font-semibold mb-2">Datos personales</h3>
          <Row label="Nombre" value={tenant.fullName} />
          <Row label="Teléfono" value={tenant.phone ?? '—'} />
          <Row label="Email" value={tenant.email ?? '—'} />
          <Row label="Identificación" value={tenant.idDocument ?? '—'} />
          <Row label="Estado" value={tenant.status} />
        </div>

        <div className="bg-surface rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-heading font-semibold">Notas</h3>
            <button onClick={() => setIsEditOpen(true)} className="text-primary text-xs font-medium hover:underline">
              Editar
            </button>
          </div>
          {tenant.notes ? (
            <p className="text-sm text-heading whitespace-pre-wrap">{tenant.notes}</p>
          ) : (
            <p className="text-sm text-muted">Sin notas registradas. Usa este espacio para observaciones internas sobre el inquilino.</p>
          )}
        </div>

        {activeContract && (
          <div className="bg-surface rounded-2xl shadow-sm p-5">
            <h3 className="text-heading font-semibold mb-2">Contrato activo</h3>
            <Row label="Propiedad" value={activeContract.property?.name ?? '—'} />
            <Row
              label="Vigencia"
              value={`${formatDate(activeContract.startDate)} — ${activeContract.endDate ? formatDate(activeContract.endDate) : '—'}`}
            />
            <Row label="Renta mensual" value={`$${Number(activeContract.monthlyRent).toLocaleString('es-MX')}`} />
            <Row label="Depósito" value={`$${Number(activeContract.depositAmount).toLocaleString('es-MX')}`} />
            <Row label="Estado" value={activeContract.status} />
            <Link href={`/contracts/${activeContract.id}`} className="block mt-4 text-primary text-sm font-medium hover:underline">
              Ver contrato completo →
            </Link>
          </div>
        )}

        {contracts.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl shadow-sm p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-muted text-xs mb-2">Contratos totales</p>
              <p className="text-heading font-bold text-2xl">{contracts.length}</p>
            </div>
            <div
              className={`rounded-2xl shadow-sm p-4 border ${
                activeContract
                  ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
                  : 'bg-gray-50 dark:bg-gray-900/10 border-gray-200 dark:border-gray-800'
              }`}
            >
              <p className="text-muted text-xs mb-2">Contratos activos</p>
              <p className="text-heading font-bold text-2xl">{contracts.filter((c) => c.status === 'ACTIVE').length}</p>
            </div>
          </div>
        )}

        {payments.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl shadow-sm p-4 border border-emerald-200 dark:border-emerald-800">
                <p className="text-muted text-xs mb-2">Puntualidad</p>
                <p className="text-heading font-bold text-2xl">{punctualityPercent}%</p>
                <p className="text-muted text-xs mt-1">
                  {punctualPayments.length}/{paidPayments.length} puntuales
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl shadow-sm p-4 border border-blue-200 dark:border-blue-800">
                <p className="text-muted text-xs mb-2">Pagos</p>
                <p className="text-heading font-bold text-2xl">{paidPayments.length}</p>
                <p className="text-muted text-xs mt-1">de {payments.length} registrados</p>
              </div>
            </div>

            <div className="bg-surface rounded-2xl shadow-sm p-5">
              <h3 className="text-heading font-semibold mb-4">Historial de pagos</h3>

              {/* Segmented control */}
              <div className="flex bg-canvas rounded-xl p-1 mb-4">
                <button
                  onClick={() => setSegment('due')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    segment === 'due' ? 'bg-surface shadow-sm text-heading' : 'text-muted'
                  }`}
                >
                  Por pagar {duePayments.length > 0 && `(${duePayments.length})`}
                </button>
                <button
                  onClick={() => setSegment('paid')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    segment === 'paid' ? 'bg-surface shadow-sm text-heading' : 'text-muted'
                  }`}
                >
                  Pagados {paidHistory.length > 0 && `(${paidHistory.length})`}
                </button>
              </div>

              {listToShow.length === 0 ? (
                <p className="text-muted text-sm text-center py-6">
                  {segment === 'due' ? 'No hay pagos vencidos ni próximos a vencer.' : 'Aún no hay pagos registrados.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {listToShow.map((payment) => {
                    const isOverdue = payment.status === 'OVERDUE';
                    const remaining = Number(payment.amountDue) - Number(payment.amountPaid || 0);
                    return (
                      <div key={payment.id} className="py-3 border-b border-black/5 dark:border-white/10 last:border-0">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <div className="flex-1 min-w-0">
                            <p className="text-heading font-medium">
                              {formatDate(segment === 'paid' ? payment.paidDate ?? payment.dueDate : payment.dueDate)}
                            </p>
                            <p className="text-muted text-xs truncate">
                              ${Number(payment.amountDue).toLocaleString('es-MX')}
                              {payment.paymentNumber && ` (${payment.paymentNumber}/${payment.totalPaymentsInContract})`}
                              {segment === 'due' && Number(payment.amountPaid) > 0 && ` · abonado $${Number(payment.amountPaid).toLocaleString('es-MX')}`}
                            </p>
                          </div>
                          {segment === 'due' ? (
                            <span
                              className={`ml-2 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                isOverdue
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                              }`}
                            >
                              {isOverdue ? 'Vencido' : 'Próximo'}
                            </span>
                          ) : (
                            <span className="ml-2 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                              Pagado
                            </span>
                          )}
                        </div>

                        {segment === 'due' ? (
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleReminder(payment)}
                              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg border border-black/10 dark:border-white/10 text-muted hover:text-heading hover:bg-canvas transition-colors"
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
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleDownloadReceipt(payment)}
                              className="flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-3 rounded-lg border border-black/10 dark:border-white/10 text-muted hover:text-heading hover:bg-canvas transition-colors"
                              aria-label="Descargar recibo"
                            >
                              <DownloadIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleShareReceipt(payment)}
                              disabled={sharingId === payment.id}
                              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg bg-primary text-white hover:bg-primary-pressed transition-colors disabled:opacity-50"
                            >
                              {sharingId === payment.id ? 'Enviando...' : 'Enviar recibo por WhatsApp'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <TenantFormModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} tenant={tenant} onSaved={loadData} />
      <PayPaymentModal
        payment={payTarget}
        isOpen={!!payTarget}
        onClose={() => setPayTarget(null)}
        onPaid={() => loadData()}
      />
    </ProtectedRoute>
  );
}

// Overdue + due within the next N days, oldest first — same bucket the
// admin sees on the Pagos page, scoped to this tenant. Plain helper (not a
// hook) so it can be called after the loading/not-found early returns above.
function getDuePayments(payments: RentPayment[], now: Date, upcomingLimit: Date) {
  return payments
    .filter((p) => {
      if (p.status === 'OVERDUE') return true;
      if (p.status === 'PENDING') {
        const due = new Date(p.dueDate);
        return due >= now && due <= upcomingLimit;
      }
      return false;
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}
