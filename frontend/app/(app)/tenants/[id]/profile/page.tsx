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
  invitesApi,
  buildWhatsAppReminderUrl,
  shareReceiptOnWhatsApp,
  getPendingPayments,
  getPaymentsDue,
  getScheduledPayments,
  paymentTypeLabels,
  maintenanceReportStatusLabels,
  Tenant,
  Contract,
  RentPayment,
  MaintenanceReport,
} from '@/lib/api';
import { formatDate } from '@/lib/formatDate';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';
import { ArrowLeftIcon, PencilIcon, TrashIcon, BellIcon, BanknoteIcon, DownloadIcon, UndoIcon, ChevronRightIcon } from '@/components/icons';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-black/5 dark:border-white/10 last:border-0 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-heading font-medium text-right">{value}</span>
    </div>
  );
}

const contractStatusLabels: Record<Contract['status'], string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Activo',
  EXPIRED: 'Expirado',
  AUTO_RENEWAL_PENDING: 'Renovación pendiente',
  CANCELLED: 'Cancelado',
};

const contractStatusColors: Record<Contract['status'], string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  EXPIRED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  AUTO_RENEWAL_PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const reportStatusColors: Record<MaintenanceReport['status'], string> = {
  CLOSED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  IN_PROGRESS: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300',
  REPORTED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
};

export default function TenantProfilePage() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tenantId = params?.id as string;
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [reports, setReports] = useState<MaintenanceReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [inePhotos, setInePhotos] = useState<{ front?: string; back?: string }>({});

  const [tab, setTab] = useState<'resumen' | 'pagos' | 'contratos' | 'reportes'>('resumen');
  const [segment, setSegment] = useState<'pending' | 'paid' | 'scheduled'>('pending');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [payTarget, setPayTarget] = useState<RentPayment | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);

  useEffect(() => {
    if (!token || !tenantId) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tenantId]);

  // Las fotos del INE se sirven por una ruta autenticada de admin, no una URL pública —
  // hay que traerlas como blob con el header de auth y armar un object URL, igual que
  // la descarga de PDFs/recibos.
  useEffect(() => {
    if (!token || !tenant) return;
    const objectUrls: string[] = [];

    const loadPhoto = async (side: 'front' | 'back', hasPhoto: boolean) => {
      if (!hasPhoto) return;
      try {
        const res = await fetch(tenantsApi.ineImageUrl(tenant.id, side), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        objectUrls.push(url);
        setInePhotos((prev) => ({ ...prev, [side]: url }));
      } catch {
        // Sin bloquear el resto del perfil si una foto no carga
      }
    };

    loadPhoto('front', !!tenant.ineFrontUrl);
    loadPhoto('back', !!tenant.ineBackUrl);

    return () => objectUrls.forEach((url) => URL.revokeObjectURL(url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tenant?.id, tenant?.ineFrontUrl, tenant?.ineBackUrl]);

  // `silent` skips the full-page "Cargando..." replacement — used when
  // refreshing after an in-place action (paying, reverting, editing) so we
  // don't unmount the whole tree (and the open modal with it) mid-flow.
  const loadData = async (options?: { silent?: boolean }) => {
    if (!options?.silent) setIsLoading(true);
    setError('');
    try {
      const [tenantData, contractsData, paymentsData, reportsData] = await Promise.all([
        tenantsApi.get(tenantId, token!),
        contractsApi.list(token!),
        rentPaymentsApi.list(token!),
        tenantsApi.getReports(tenantId, token!),
      ]);
      setTenant(tenantData);
      setContracts(contractsData.filter((c) => c.tenantId === tenantId));
      setPayments(paymentsData.filter((p) => p.tenantId === tenantId));
      setReports(reportsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      if (!options?.silent) setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !tenant) return;
    const confirmed = await confirm({
      title: 'Eliminar inquilino',
      message: `¿Eliminar a ${tenant.fullName}? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!confirmed) return;
    setIsDeleting(true);
    try {
      await tenantsApi.remove(tenant.id, token);
      router.push('/tenants');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al eliminar', 'error');
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
        showToast('El recibo se descargó — adjúntalo manualmente en la conversación de WhatsApp que se abrió.', 'info');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al compartir el recibo', 'error');
    } finally {
      setSharingId(null);
    }
  };

  const handleRevertPayment = async (payment: RentPayment) => {
    if (!token) return;
    const confirmed = await confirm('¿Revertir este pago? Volverá a marcarse como no pagado y podrás registrarlo de nuevo.');
    if (!confirmed) return;
    setRevertingId(payment.id);
    try {
      await rentPaymentsApi.update(payment.id, { amountPaid: 0, paidDate: null }, token);
      await loadData({ silent: true });
      showToast('Pago revertido.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al revertir el pago', 'error');
    } finally {
      setRevertingId(null);
    }
  };

  const handleCreateInvite = async () => {
    if (!token || !tenant) return;
    setIsCreatingInvite(true);
    try {
      const invite = await invitesApi.create({ role: 'INQUILINO', tenantId: tenant.id }, token);
      setInviteLink(invite.link);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al generar el link de registro', 'error');
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleCopyInviteLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    showToast('Link copiado', 'success');
  };

  const handleDownloadReceipt = async (payment: RentPayment) => {
    if (!token) return;
    try {
      await rentPaymentsApi.downloadReceipt(payment.id, token);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al descargar el recibo', 'error');
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

  const pendingPayments = getPendingPayments(payments).filter((p) => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return new Date(p.dueDate) <= sevenDaysFromNow;
  });
  const scheduledPayments = getPendingPayments(payments).filter((p) => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return new Date(p.dueDate) > sevenDaysFromNow;
  });
  const paidHistory = [...paidPayments].sort((a, b) => new Date(b.paidDate ?? b.dueDate).getTime() - new Date(a.paidDate ?? a.dueDate).getTime());

  const listToShow = segment === 'pending' ? pendingPayments : segment === 'paid' ? paidHistory : scheduledPayments;
  const sortedContracts = [...contracts].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  const openReportsCount = reports.filter((r) => r.status !== 'CLOSED').length;

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

        {/* Resumen / Pagos / Contratos / Reportes — antes todo vivía en un solo scroll
            largo (datos, notas, fotos, stats, historial de pagos, historial de contratos,
            reportes) y abrumaba. Se agrupa por tarea: consultar identidad, cobrar, revisar
            contratos, o atender incidencias — mismo patrón que /profile del inquilino. */}
        <div className="flex bg-canvas rounded-xl p-1 gap-1 overflow-x-auto">
          {(
            [
              ['resumen', 'Resumen'],
              ['pagos', `Pagos${pendingPayments.length > 0 ? ` (${pendingPayments.length})` : ''}`],
              ['contratos', 'Contratos'],
              ['reportes', `Reportes${openReportsCount > 0 ? ` (${openReportsCount})` : ''}`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`flex-1 py-2 px-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                tab === value ? 'bg-surface shadow-sm text-heading' : 'text-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'resumen' && (
          <div className="space-y-6">
            <div className="bg-surface rounded-2xl shadow-sm p-5">
              <h3 className="text-heading font-semibold mb-2">Datos personales</h3>
              <Row label="Nombre" value={tenant.fullName} />
              <Row label="Teléfono" value={tenant.phone ?? '—'} />
              <Row label="Email" value={tenant.email ?? '—'} />
              <Row label="Clave de elector" value={tenant.idDocument ?? '—'} />
              <Row label="CURP" value={tenant.curp ?? '—'} />
              <Row label="Fecha de nacimiento" value={tenant.birthDate ? formatDate(tenant.birthDate) : '—'} />
              <Row label="Domicilio" value={tenant.address ?? '—'} />
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

            {(tenant.ineFrontUrl || tenant.ineBackUrl) && (
              <div className="bg-surface rounded-2xl shadow-sm p-5">
                <h3 className="text-heading font-semibold mb-1">Fotografías del INE</h3>
                <p className="text-muted text-xs mb-3">Guardadas como respaldo. Toca una foto para verla en tamaño completo.</p>
                <div className="flex gap-3">
                  {inePhotos.front && (
                    <a href={inePhotos.front} target="_blank" rel="noopener noreferrer" className="block w-1/2">
                      <img src={inePhotos.front} alt="Frente del INE" className="w-full rounded-xl shadow-sm" />
                      <p className="text-muted text-xs text-center mt-1">Frente</p>
                    </a>
                  )}
                  {inePhotos.back && (
                    <a href={inePhotos.back} target="_blank" rel="noopener noreferrer" className="block w-1/2">
                      <img src={inePhotos.back} alt="Reverso del INE" className="w-full rounded-xl shadow-sm" />
                      <p className="text-muted text-xs text-center mt-1">Reverso</p>
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="bg-surface rounded-2xl shadow-sm p-5">
              <h3 className="text-heading font-semibold mb-1">Acceso al portal</h3>
              {tenant.userId ? (
                <p className="text-sm text-muted">Ya tiene una cuenta vinculada — puede iniciar sesión con su teléfono.</p>
              ) : !tenant.phone ? (
                <p className="text-sm text-muted">Agrega un teléfono al inquilino antes de generar su link de registro.</p>
              ) : (
                <>
                  <p className="text-sm text-muted mb-3">
                    Aún no tiene cuenta. Genera un link de un solo uso para que se registre — sólo le pedirá una contraseña.
                  </p>
                  {inviteLink ? (
                    <div className="flex items-center gap-2 bg-canvas rounded-lg px-3 py-2">
                      <p className="text-xs text-heading truncate flex-1">{inviteLink}</p>
                      <button onClick={handleCopyInviteLink} className="text-primary text-xs font-medium shrink-0 hover:underline">
                        Copiar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleCreateInvite}
                      disabled={isCreatingInvite}
                      className="text-primary text-sm font-medium disabled:opacity-50"
                    >
                      {isCreatingInvite ? 'Generando...' : 'Generar link de registro'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {tab === 'pagos' && (
          <div className="space-y-6">
            {payments.length === 0 ? (
              <div className="bg-surface rounded-2xl shadow-sm p-6">
                <p className="text-muted text-sm text-center">Sin pagos registrados todavía.</p>
              </div>
            ) : (
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
                      onClick={() => setSegment('pending')}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        segment === 'pending' ? 'bg-surface shadow-sm text-heading' : 'text-muted'
                      }`}
                    >
                      Programados {pendingPayments.length > 0 && `(${pendingPayments.length})`}
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
                      {segment === 'pending' ? 'No hay pagos programados pendientes.' : 'Aún no hay pagos registrados.'}
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
                                <div className="flex items-center gap-1.5">
                                  <p className="text-heading font-medium">
                                    {formatDate(segment === 'paid' ? payment.paidDate ?? payment.dueDate : payment.dueDate)}
                                  </p>
                                  {payment.paymentType && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-black/5 dark:bg-white/10 text-muted">
                                      {paymentTypeLabels[payment.paymentType]}
                                    </span>
                                  )}
                                </div>
                                <p className="text-muted text-xs truncate">
                                  ${Number(payment.amountDue).toLocaleString('es-MX')}
                                  {payment.paymentNumber && ` (${payment.paymentNumber}/${payment.totalPaymentsInContract})`}
                                  {segment === 'pending' && Number(payment.amountPaid) > 0 && ` · abonado $${Number(payment.amountPaid).toLocaleString('es-MX')}`}
                                </p>
                              </div>
                              {segment === 'pending' ? (
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

                            {segment === 'pending' ? (
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
              </>
            )}
          </div>
        )}

        {tab === 'contratos' && (
          <div className="space-y-6">
            {contracts.length === 0 ? (
              <div className="bg-surface rounded-2xl shadow-sm p-6">
                <p className="text-muted text-sm text-center">Sin contratos registrados todavía.</p>
              </div>
            ) : (
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

            {sortedContracts.length > 0 && (
              <div className="bg-surface rounded-2xl shadow-sm p-5">
                <h3 className="text-heading font-semibold mb-4">Historial de contratos</h3>
                <div className="space-y-2">
                  {sortedContracts.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-3 py-3 border-b border-black/5 dark:border-white/10 last:border-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-heading font-medium text-sm truncate">{c.property?.name ?? '—'}</p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${contractStatusColors[c.status]}`}>
                            {contractStatusLabels[c.status]}
                          </span>
                        </div>
                        <p className="text-muted text-xs mt-0.5">
                          {formatDate(c.startDate)} — {c.endDate ? formatDate(c.endDate) : '—'} · $
                          {Number(c.monthlyRent).toLocaleString('es-MX')}/mes
                        </p>
                      </div>
                      <Link href={`/contracts/${c.id}`} className="shrink-0 text-primary text-sm font-medium hover:underline">
                        Ver detalle →
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'reportes' && (
          <div className="bg-surface rounded-2xl shadow-sm p-5">
            <h3 className="text-heading font-semibold mb-3">Reportes</h3>
            {reports.length === 0 ? (
              <p className="text-muted text-sm">Sin incidencias reportadas.</p>
            ) : (
              <div className="space-y-2">
                {reports.map((report) => (
                  <Link
                    key={report.id}
                    href={`/tenants/${tenantId}/reports/${report.id}`}
                    className="flex items-center gap-3 py-2.5 border-b border-black/5 dark:border-white/10 last:border-0 active:opacity-70 transition-opacity"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-heading text-sm truncate">{report.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${reportStatusColors[report.status]}`}>
                          {maintenanceReportStatusLabels[report.status]}
                        </span>
                        <span className="text-muted text-xs">{formatDate(report.createdAt)}</span>
                      </div>
                    </div>
                    <ChevronRightIcon className="w-4 h-4 text-muted shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <TenantFormModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        tenant={tenant}
        onSaved={() => loadData({ silent: true })}
      />
      <PayPaymentModal
        payment={payTarget}
        isOpen={!!payTarget}
        onClose={() => setPayTarget(null)}
        onPaid={() => loadData({ silent: true })}
      />
    </ProtectedRoute>
  );
}
