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
import { DetailHeader } from '@/components/StitchHeader';

const contractStatusLabels: Record<Contract['status'], string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Activo',
  EXPIRED: 'Expirado',
  AUTO_RENEWAL_PENDING: 'Renovación pendiente',
  CANCELLED: 'Cancelado',
};

// Fuera del componente: la regla de pureza de React marca Date.now() dentro del render.
const daysTo = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);

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
        <DetailHeader title="Perfil de Inquilino" backHref="/tenants" />
        <p className="px-4 pt-4 text-xs text-[#A7B0BB]">Cargando...</p>
      </ProtectedRoute>
    );
  }

  if (!tenant) {
    return (
      <ProtectedRoute requiredRole="ADMIN">
        <DetailHeader title="Perfil de Inquilino" backHref="/tenants" />
        <div className="p-4">
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-700">{error || 'No se pudo cargar el inquilino'}</div>
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

  const money = (n: number | string) => `$${Number(n).toLocaleString('es-MX')}`;
  const initials = tenant.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  const nextPayment = [...pendingPayments, ...scheduledPayments].sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))[0];
  const hasOverdue = payments.some((p) => p.status === 'OVERDUE');
  const statusBadge: Record<Contract['status'], string> = {
    DRAFT: 'bg-amber-50 text-amber-700',
    ACTIVE: 'bg-[#2D9E6B]/10 text-[#2D9E6B]',
    EXPIRED: 'bg-[#F5F1E8] text-[#A7B0BB]',
    AUTO_RENEWAL_PENDING: 'bg-amber-50 text-amber-700',
    CANCELLED: 'bg-rose-50 text-rose-700',
  };
  const reportBadge: Record<MaintenanceReport['status'], string> = {
    REPORTED: 'bg-amber-50 text-amber-700',
    IN_PROGRESS: 'bg-[#173A5F]/10 text-[#173A5F]',
    CLOSED: 'bg-[#F5F1E8] text-[#A7B0BB]',
  };
  const TABS = [
    { key: 'resumen' as const, label: 'Resumen', count: 0, countClass: '' },
    { key: 'pagos' as const, label: 'Pagos', count: pendingPayments.length, countClass: 'bg-[#F5F1E8] text-[#173A5F]' },
    { key: 'contratos' as const, label: 'Contratos', count: 0, countClass: '' },
    { key: 'reportes' as const, label: 'Reportes', count: openReportsCount, countClass: 'bg-[#2D9E6B]/15 text-[#2D9E6B]' },
  ];

  return (
    <ProtectedRoute requiredRole="ADMIN">
      {/* Markup portado de Stitch: design/stitch/tenant-profile.html */}
      <DetailHeader title="Perfil de Inquilino" backHref="/tenants" />

      <main className="w-full max-w-md sm:max-w-3xl mx-auto px-4 pt-4 pb-6 flex-1 flex flex-col gap-4">
        {error && <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-700">{error}</div>}

        {/* Cabecera del Inquilino */}
        <section className="card-ksared p-4 bg-white">
          <div className="flex items-start gap-3.5">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-lg bg-[#173A5F] text-white flex items-center justify-center font-sans font-bold text-xl border-2 border-white shadow-sm overflow-hidden">
                <span className="tracking-wide">{initials}</span>
              </div>
              {tenant.status === 'ACTIVE' && (
                <span className="absolute -bottom-1 -right-1 bg-[#2D9E6B] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 border border-white">
                  <span className="material-symbols-outlined text-[10px] fill">check_circle</span>
                  Activo
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <h2 className="font-sans font-bold text-xl text-[#173A5F] truncate">{tenant.fullName}</h2>
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-[#173A5F]/80 font-medium">
                <span className="material-symbols-outlined text-sm text-[#2D9E6B]">apartment</span>
                <span className="truncate">{activeContract?.property?.name ?? 'Sin contrato activo'}</span>
              </div>
              <p className="text-[11px] text-[#A7B0BB] mt-0.5">
                {tenant.status === 'ACTIVE' ? 'Inquilino activo' : tenant.status === 'EVICTED' ? 'Desalojado' : 'Finalizado'}
                {tenant.userId ? ' • Portal activo' : ' • Sin cuenta en portal'}
              </p>
            </div>
          </div>
          {/* Barra de Acciones */}
          <div className="grid grid-cols-4 gap-2 mt-4 pt-3.5 border-t border-[#DDD9CF]/80">
            <a
              className={`flex flex-col items-center justify-center p-2 rounded-lg bg-[#F5F1E8] hover:bg-[#DDD9CF]/50 active:scale-95 transition-all group ${tenant.phone ? '' : 'opacity-40 pointer-events-none'}`}
              href={tenant.phone ? `tel:${tenant.phone}` : undefined}
            >
              <span className="material-symbols-outlined text-[#173A5F] group-hover:text-[#2D9E6B] text-lg mb-0.5">call</span>
              <span className="text-[10px] font-semibold text-[#173A5F]">Llamar</span>
            </a>
            <a
              className={`flex flex-col items-center justify-center p-2 rounded-lg bg-[#2D9E6B]/10 hover:bg-[#2D9E6B]/20 active:scale-95 transition-all text-[#2D9E6B] ${tenant.phone ? '' : 'opacity-40 pointer-events-none'}`}
              href={tenant.phone ? `https://wa.me/52${tenant.phone.replace(/\D/g, '').slice(-10)}` : undefined}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="material-symbols-outlined text-lg mb-0.5">chat</span>
              <span className="text-[10px] font-semibold">Mensaje</span>
            </a>
            <button
              onClick={() => setIsEditOpen(true)}
              className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#173A5F]/5 hover:bg-[#173A5F]/10 active:scale-95 transition-all text-[#173A5F]"
              type="button"
            >
              <span className="material-symbols-outlined text-lg mb-0.5">edit</span>
              <span className="text-[10px] font-semibold">Editar</span>
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex flex-col items-center justify-center p-2 rounded-lg bg-rose-50 hover:bg-rose-100/70 active:scale-95 transition-all text-rose-700 disabled:opacity-50"
              type="button"
            >
              <span className="material-symbols-outlined text-lg mb-0.5">delete</span>
              <span className="text-[10px] font-semibold">Eliminar</span>
            </button>
          </div>
        </section>

        {/* Tabs Planas */}
        <nav aria-label="Pestañas de inquilino" className="flex border-b border-[#DDD9CF] bg-white rounded-lg px-2 pt-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={
                tab === t.key
                  ? 'relative flex-1 py-2.5 text-center text-xs font-semibold text-[#173A5F] border-b-[3px] border-[#2D9E6B] transition-colors flex items-center justify-center gap-1'
                  : 'flex-1 py-2.5 text-center text-xs font-medium text-[#A7B0BB] hover:text-[#173A5F] transition-colors flex items-center justify-center gap-1'
              }
            >
              <span>{t.label}</span>
              {t.count > 0 && (
                <span className={`inline-flex items-center justify-center text-[10px] font-bold px-1.5 rounded-full ${t.countClass}`}>{t.count}</span>
              )}
            </button>
          ))}
        </nav>

        {tab === 'resumen' && (
          <div className="flex flex-col gap-3.5">
            {/* Datos personales */}
            <section className="card-ksared p-4">
              <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#DDD9CF]/80">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#173A5F]/10 text-[#173A5F]">
                    <span className="material-symbols-outlined text-base text-[#173A5F]">badge</span>
                  </span>
                  <h3 className="font-sans font-semibold text-sm text-[#173A5F]">Datos personales</h3>
                </div>
                {tenant.ineFrontUrl && (
                  <span className="text-[11px] font-medium text-[#2D9E6B] flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-xs fill">verified</span> INE capturado
                  </span>
                )}
              </div>
              <div className="space-y-3 text-xs">
                {[
                  { icon: 'phone_iphone', label: 'Teléfono', value: tenant.phone, copy: true },
                  { icon: 'mail', label: 'Correo electrónico', value: tenant.email },
                  { icon: 'fingerprint', label: 'Clave de elector', value: tenant.idDocument },
                  { icon: 'id_card', label: 'CURP', value: tenant.curp },
                  { icon: 'cake', label: 'Fecha de nacimiento', value: tenant.birthDate ? formatDate(tenant.birthDate) : null },
                  { icon: 'home_pin', label: 'Domicilio', value: tenant.address },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-0.5 gap-3">
                    <div className="text-[#A7B0BB] flex items-center gap-1.5 shrink-0">
                      <span className="material-symbols-outlined text-sm text-[#A7B0BB]">{row.icon}</span>
                      <span>{row.label}</span>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-[#173A5F] truncate text-right">{row.value || '—'}</span>
                      {row.copy && row.value && (
                        <button
                          aria-label="Copiar teléfono"
                          onClick={() => {
                            navigator.clipboard.writeText(row.value as string);
                            showToast('Teléfono copiado', 'success');
                          }}
                          className="text-[#A7B0BB] hover:text-[#2D9E6B] active:scale-90 transition-transform"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-sm">content_copy</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Detalles del arrendamiento */}
            {activeContract && (
              <section className="card-ksared p-4">
                <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#DDD9CF]/80">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#2D9E6B]/10 text-[#2D9E6B]">
                      <span className="material-symbols-outlined text-base text-[#2D9E6B]">apartment</span>
                    </span>
                    <h3 className="font-sans font-semibold text-sm text-[#173A5F]">Detalles del arrendamiento</h3>
                  </div>
                  {hasOverdue ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span> Con adeudo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2D9E6B] bg-[#2D9E6B]/10 px-2 py-0.5 rounded">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2D9E6B]"></span> Al corriente
                    </span>
                  )}
                </div>
                <div className="space-y-2.5 text-xs">
                  <div>
                    <div className="text-[11px] text-[#A7B0BB] font-medium">Inmueble asignado</div>
                    <div className="font-semibold text-[#173A5F] text-sm mt-0.5">{activeContract.property?.name ?? '—'}</div>
                    {activeContract.property?.city && <div className="text-[11px] text-[#A7B0BB]">{activeContract.property.city}</div>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#DDD9CF]/60">
                    <div className="bg-[#F5F1E8] p-2.5 rounded-lg">
                      <div className="text-[10px] text-[#A7B0BB] uppercase font-bold tracking-wider">Renta Mensual</div>
                      <div className="text-sm font-bold text-[#173A5F] mt-0.5">
                        {money(activeContract.monthlyRent)} <span className="text-[10px] font-medium text-[#A7B0BB]">MXN</span>
                      </div>
                      <div className="text-[10px] text-[#2D9E6B] font-medium mt-0.5 flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[11px]">event_available</span> Día {activeContract.paymentDay} c/mes
                      </div>
                    </div>
                    <div className="bg-[#F5F1E8] p-2.5 rounded-lg">
                      <div className="text-[10px] text-[#A7B0BB] uppercase font-bold tracking-wider">Próximo Cobro</div>
                      <div className="text-sm font-bold text-[#173A5F] mt-0.5">{nextPayment ? formatDate(nextPayment.dueDate) : '—'}</div>
                      {nextPayment && (
                        <div className="text-[10px] text-[#173A5F]/80 font-medium mt-0.5 flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[11px] text-[#173A5F]">schedule</span>
                          {daysTo(nextPayment.dueDate) >= 0 ? `En ${daysTo(nextPayment.dueDate)} días` : `Hace ${-daysTo(nextPayment.dueDate)} días`}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className="text-[#A7B0BB]">Depósito en garantía:</span>
                    <span className="font-semibold text-[#173A5F]">{money(activeContract.depositAmount)} MXN</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#A7B0BB]">Vigencia de contrato:</span>
                    <span className="font-semibold text-[#173A5F]">
                      {formatDate(activeContract.startDate)} – {activeContract.endDate ? formatDate(activeContract.endDate) : '—'}
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* Notas de administración */}
            <section className="card-ksared p-4 bg-white">
              <div className="flex items-center justify-between pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#173A5F]/10 text-[#173A5F]">
                    <span className="material-symbols-outlined text-base">sticky_note_2</span>
                  </span>
                  <h3 className="font-sans font-semibold text-sm text-[#173A5F]">Notas de administración</h3>
                </div>
                <button
                  onClick={() => setIsEditOpen(true)}
                  className="text-xs font-semibold text-[#2D9E6B] hover:text-[#173A5F] flex items-center gap-0.5 transition-colors"
                  type="button"
                >
                  <span className="material-symbols-outlined text-sm">{tenant.notes ? 'edit' : 'add'}</span> {tenant.notes ? 'Editar nota' : 'Añadir nota'}
                </button>
              </div>
              <div className="bg-[#F5F1E8] p-3 rounded-lg border border-[#DDD9CF]">
                <p className="text-xs text-[#173A5F]/90 leading-relaxed font-normal whitespace-pre-wrap">
                  {tenant.notes || 'Sin notas registradas. Usa este espacio para observaciones internas sobre el inquilino.'}
                </p>
              </div>
            </section>

            {/* Fotografías del INE */}
            {(tenant.ineFrontUrl || tenant.ineBackUrl) && (
              <section className="card-ksared p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#173A5F]/10 text-[#173A5F]">
                    <span className="material-symbols-outlined text-base">id_card</span>
                  </span>
                  <h3 className="font-sans font-semibold text-sm text-[#173A5F]">Fotografías del INE</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(['front', 'back'] as const).map(
                    (side) =>
                      inePhotos[side] && (
                        <a key={side} href={inePhotos[side]} target="_blank" rel="noopener noreferrer" className="block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={inePhotos[side]} alt={side === 'front' ? 'Frente del INE' : 'Reverso del INE'} className="w-full rounded-lg border border-[#DDD9CF]" />
                          <p className="text-[10px] text-[#A7B0BB] text-center mt-1">{side === 'front' ? 'Frente' : 'Reverso'}</p>
                        </a>
                      )
                  )}
                </div>
              </section>
            )}

            {/* Acceso al portal */}
            <section className="card-ksared p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#2D9E6B]/10 text-[#2D9E6B]">
                    <span className="material-symbols-outlined text-base text-[#2D9E6B]">vpn_key</span>
                  </span>
                  <h3 className="font-sans font-semibold text-sm text-[#173A5F]">Acceso al portal inquilino</h3>
                </div>
                <span className={`w-2.5 h-2.5 rounded-full ring-4 ${tenant.userId ? 'bg-[#2D9E6B] ring-[#2D9E6B]/20' : 'bg-[#A7B0BB] ring-[#A7B0BB]/20'}`}></span>
              </div>
              {tenant.userId ? (
                <p className="text-xs text-[#173A5F]/80">
                  Estado: <strong className="text-[#2D9E6B]">Activo</strong> • Inicia sesión con su teléfono.
                </p>
              ) : !tenant.phone ? (
                <p className="text-xs text-[#173A5F]/80">Agrega un teléfono al inquilino antes de generar su link de registro.</p>
              ) : (
                <>
                  <p className="text-xs text-[#173A5F]/80">
                    Estado: <strong className="text-amber-700">Sin cuenta</strong> • Genera un link de un solo uso para que se registre.
                  </p>
                  {inviteLink ? (
                    <div className="mt-3 flex items-center gap-2 bg-[#F5F1E8] rounded-lg px-3 py-2 border border-[#DDD9CF]">
                      <p className="text-xs text-[#173A5F] truncate flex-1">{inviteLink}</p>
                      <button onClick={handleCopyInviteLink} className="text-[#2D9E6B] text-xs font-semibold shrink-0">
                        Copiar
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={handleCreateInvite}
                        disabled={isCreatingInvite}
                        className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-[#2D9E6B] hover:opacity-90 active:scale-95 transition-all rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-sm">link</span> {isCreatingInvite ? 'Generando...' : 'Generar link de registro'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        )}

        {tab === 'pagos' && (
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-2 gap-2">
              <div className="card-ksared p-3">
                <div className="text-[10px] text-[#A7B0BB] uppercase font-bold tracking-wider">Puntualidad</div>
                <div className="text-xl font-bold text-[#173A5F] mt-0.5">{punctualityPercent}%</div>
                <div className="text-[10px] text-[#2D9E6B] font-medium">
                  {punctualPayments.length}/{paidPayments.length} puntuales
                </div>
              </div>
              <div className="card-ksared p-3">
                <div className="text-[10px] text-[#A7B0BB] uppercase font-bold tracking-wider">Pagos</div>
                <div className="text-xl font-bold text-[#173A5F] mt-0.5">{paidPayments.length}</div>
                <div className="text-[10px] text-[#A7B0BB] font-medium">de {payments.length} registrados</div>
              </div>
            </div>

            <nav className="bg-white p-1 rounded-[8px] border border-[#DDD9CF] flex gap-1">
              {(
                [
                  ['pending', 'Por pagar', pendingPayments.length],
                  ['scheduled', 'Programados', scheduledPayments.length],
                  ['paid', 'Pagados', paidHistory.length],
                ] as const
              ).map(([key, label, count]) => (
                <button
                  key={key}
                  onClick={() => setSegment(key)}
                  className={
                    segment === key
                      ? 'flex-1 py-1.5 px-2 text-xs font-bold rounded-[8px] bg-[#173A5F] text-white'
                      : 'flex-1 py-1.5 px-2 text-xs font-medium rounded-[8px] text-[#173A5F] hover:bg-[#F5F1E8]'
                  }
                >
                  {label} {count > 0 && `(${count})`}
                </button>
              ))}
            </nav>

            {listToShow.length === 0 ? (
              <div className="card-ksared p-6 text-center text-xs text-[#A7B0BB]">
                {segment === 'paid' ? 'Aún no hay pagos registrados.' : 'Sin pagos en esta sección.'}
              </div>
            ) : (
              listToShow.map((payment) => {
                const isOverdue = payment.status === 'OVERDUE';
                const isPaid = payment.status === 'PAID';
                const remaining = Number(payment.amountDue) - Number(payment.amountPaid || 0);
                return (
                  <article key={payment.id} className={`card-ksared p-3.5 relative overflow-hidden ${isOverdue ? 'border-rose-200' : ''}`}>
                    {isOverdue && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#DC2626]"></div>}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-[#173A5F]">{formatDate(isPaid ? payment.paidDate ?? payment.dueDate : payment.dueDate)}</p>
                        <p className="text-[11px] text-[#A7B0BB]">
                          {payment.paymentType ? paymentTypeLabels[payment.paymentType] : 'Renta'}
                          {payment.paymentNumber && ` · ${payment.paymentNumber}/${payment.totalPaymentsInContract}`}
                          {!isPaid && Number(payment.amountPaid) > 0 && ` · abonado ${money(payment.amountPaid)}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${isPaid ? 'text-[#2D9E6B]' : isOverdue ? 'text-[#DC2626]' : 'text-[#173A5F]'}`}>{money(payment.amountDue)}</p>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-[8px] text-[10px] font-bold ${
                            isPaid ? 'bg-[#DCFCE7] text-[#2D9E6B]' : isOverdue ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-[#FEF3C7] text-[#D97706]'
                          }`}
                        >
                          {isPaid ? 'Pagado' : isOverdue ? 'Vencido' : 'Próximo'}
                        </span>
                      </div>
                    </div>
                    {isPaid ? (
                      <div className="mt-3 grid grid-cols-[auto_1fr_auto] gap-2">
                        <button
                          onClick={() => handleDownloadReceipt(payment)}
                          aria-label="Descargar recibo"
                          className="py-2 px-3 rounded-[8px] border border-[#DDD9CF] bg-[#F5F1E8]/50 hover:bg-[#F5F1E8] text-[#173A5F] flex items-center justify-center"
                        >
                          <span className="material-symbols-outlined text-[16px]">download</span>
                        </button>
                        <button
                          onClick={() => handleShareReceipt(payment)}
                          disabled={sharingId === payment.id}
                          className="w-full py-2 px-3 rounded-[8px] border border-[#DDD9CF] bg-[#F5F1E8]/50 hover:bg-[#F5F1E8] text-[#173A5F] text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                          {sharingId === payment.id ? 'Enviando...' : 'Enviar recibo por WhatsApp'}
                        </button>
                        <button
                          onClick={() => handleRevertPayment(payment)}
                          disabled={revertingId === payment.id}
                          aria-label="Revertir pago"
                          className="py-2 px-3 rounded-[8px] border border-[#DDD9CF] bg-white text-[#D97706] hover:bg-[#FEF3C7] flex items-center justify-center disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[16px]">undo</span>
                        </button>
                      </div>
                    ) : (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleReminder(payment)}
                          className="w-full py-2 px-2.5 rounded-[8px] border border-[#A7B0BB]/60 bg-white text-[#173A5F] hover:bg-[#F5F1E8] text-xs font-semibold flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[16px]">send</span>
                          Recordatorio
                        </button>
                        <button
                          onClick={() => setPayTarget(payment)}
                          className="w-full py-2 px-2.5 rounded-[8px] bg-[#2D9E6B] hover:opacity-95 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          Registrar pago{remaining < Number(payment.amountDue) ? ` (${money(remaining)})` : ''}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        )}

        {tab === 'contratos' && (
          <div className="flex flex-col gap-3.5">
            {sortedContracts.length === 0 ? (
              <div className="card-ksared p-6 text-center text-xs text-[#A7B0BB]">Sin contratos registrados todavía.</div>
            ) : (
              sortedContracts.map((c) => (
                <Link key={c.id} href={`/contracts/${c.id}`} className="card-ksared p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[#173A5F]">description</span>
                      <p className="text-sm font-bold text-[#173A5F] truncate">{c.property?.name ?? '—'}</p>
                    </div>
                    <p className="text-[11px] text-[#A7B0BB] mt-0.5">
                      {formatDate(c.startDate)} – {c.endDate ? formatDate(c.endDate) : '—'} · {money(c.monthlyRent)}/mes
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${statusBadge[c.status]}`}>{contractStatusLabels[c.status]}</span>
                    <span className="material-symbols-outlined text-[18px] text-[#A7B0BB]">chevron_right</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {tab === 'reportes' && (
          <div className="flex flex-col gap-3.5">
            {reports.length === 0 ? (
              <div className="card-ksared p-6 text-center text-xs text-[#A7B0BB]">Sin incidencias reportadas.</div>
            ) : (
              reports.map((report) => (
                <Link key={report.id} href={`/tenants/${tenantId}/reports/${report.id}`} className="card-ksared p-3.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#173A5F] font-medium truncate">{report.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${reportBadge[report.status]}`}>
                        {maintenanceReportStatusLabels[report.status]}
                      </span>
                      <span className="text-[11px] text-[#A7B0BB]">{formatDate(report.createdAt)}</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-[#A7B0BB] shrink-0">chevron_right</span>
                </Link>
              ))
            )}
          </div>
        )}
      </main>

      <TenantFormModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} tenant={tenant} onSaved={() => loadData({ silent: true })} />
      <PayPaymentModal payment={payTarget} isOpen={!!payTarget} onClose={() => setPayTarget(null)} onPaid={() => loadData({ silent: true })} />
    </ProtectedRoute>
  );
}
