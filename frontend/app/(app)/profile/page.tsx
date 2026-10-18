'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  meApi,
  MyTenant,
  Contract,
  RentPayment,
  MaintenanceReport,
  getPaymentsDue,
  getScheduledPayments,
} from '@/lib/api';
import { formatDate } from '@/lib/formatDate';
import { useToast } from '@/components/ToastProvider';
import { Modal, btnSecondary, btnConfirm } from '@/components/Modal';
import { ReportCard } from '@/components/ReportCard';
import { BrandLogo } from '@/components/BrandLogo';
import { NotificationBell } from '@/components/NotificationBell';

function TenantProfile() {
  const { token } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  // ?tab=reportes lo usa el botón "volver" del chat para regresar directo a la lista.
  const [tab, setTab] = useState<'perfil' | 'reportes'>(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tab') === 'reportes' ? 'reportes' : 'perfil'
  );
  const [tenant, setTenant] = useState<MyTenant | null | undefined>(undefined);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);
  const [paymentSegment, setPaymentSegment] = useState<'pending' | 'paid' | 'scheduled'>('pending');
  const [reports, setReports] = useState<MaintenanceReport[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const loadReports = (authToken: string) => meApi.getMyReports(authToken).then(setReports);

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    Promise.all([meApi.getTenant(token), meApi.getContracts(token), meApi.getPayments(token), loadReports(token)])
      .then(([tenantData, contractsData, paymentsData]) => {
        setTenant(tenantData);
        setContracts(contractsData);
        setPayments(paymentsData);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const handleSubmitReport = async () => {
    if (!token || !reportDescription.trim()) return;
    setIsSubmittingReport(true);
    try {
      const created = await meApi.createReport(reportDescription.trim(), token);
      setReportDescription('');
      setIsReportModalOpen(false);
      showToast('Incidencia reportada. El administrador fue notificado.', 'success');
      router.push(`/profile/reports/${created.id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al reportar la incidencia', 'error');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleDownloadContract = async (id: string) => {
    if (!token) return;
    setDownloadingId(id);
    try {
      await meApi.downloadContractPdf(id, token);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al descargar el contrato', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadReceipt = async (id: string) => {
    if (!token) return;
    setDownloadingReceiptId(id);
    try {
      await meApi.downloadReceipt(id, token);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al descargar el recibo', 'error');
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  // Calculate punctuality: % of payments that were paid on or before due date
  const paidPayments = useMemo(() => payments.filter((p) => p.status === 'PAID'), [payments]);
  const punctualPayments = useMemo(
    () =>
      paidPayments.filter((p) => {
        if (!p.paidDate) return false;
        return new Date(p.paidDate) <= new Date(p.dueDate);
      }),
    [paidPayments]
  );
  const punctualityPercent = useMemo(() => (paidPayments.length > 0 ? Math.round((punctualPayments.length / paidPayments.length) * 100) : 0), [paidPayments, punctualPayments]);

  // Filter payments by segment
  const pendingPayments = useMemo(() => getPaymentsDue(payments), [payments]);
  const scheduledPayments = useMemo(() => getScheduledPayments(payments), [payments]);
  const displayedPayments = useMemo(
    () =>
      paymentSegment === 'pending'
        ? pendingPayments
        : paymentSegment === 'paid'
          ? [...paidPayments].sort((a, b) => new Date(b.paidDate ?? b.dueDate).getTime() - new Date(a.paidDate ?? a.dueDate).getTime())
          : scheduledPayments,
    [paymentSegment, pendingPayments, scheduledPayments, paidPayments]
  );

  const activeContract = contracts.find((c) => c.status === 'ACTIVE') ?? contracts[0];
  const openReports = reports.filter((r) => r.status !== 'CLOSED').length;
  const closedReports = reports.length - openReports;

  const card = 'bg-[#ffffff] rounded-lg border border-[#A7B0BB]/30 p-4';
  const segBtn = (active: boolean) =>
    active
      ? 'flex-1 py-1.5 rounded-lg bg-[#173a5f] text-white text-[11px] font-semibold'
      : 'flex-1 py-1.5 rounded-lg text-[#43474e] text-[11px] font-medium hover:text-[#173a5f]';

  // Markup portado de Stitch: design/stitch/tenant-reports.html (encabezado, tabs y lista)
  return (
    <>
      <header className="bg-[#173A5F] text-[#ffffff] w-full pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <div className="max-w-md sm:max-w-2xl mx-auto">
          <div className="px-4 flex items-center justify-between sm:hidden">
            <BrandLogo size="sm" onDark />
            <NotificationBell onDark />
          </div>
          <div className="px-4 pb-3 pt-3 sm:pt-0 flex justify-between items-end">
            <div>
              <span className="block text-[0.6875rem] font-semibold uppercase tracking-wider text-[#85a4cf]">PORTAL INQUILINO</span>
              <h1 className="text-white text-[1.125rem] font-bold leading-tight mt-0.5">Mi Perfil</h1>
            </div>
            {(tenant?.currentProperty ?? null) && (
              <span className="inline-flex items-center text-[0.75rem] text-[#F5F1E8] font-medium bg-white/10 px-2.5 py-0.5 rounded max-w-[55%] truncate">
                <span className="material-symbols-outlined text-[14px] mr-1 text-[#2D9E6B]">apartment</span>
                {tenant?.currentProperty?.name}
              </span>
            )}
          </div>
        </div>
      </header>

      <nav className="bg-[#ffffff] border-b border-[#c3c6cf]/40 w-full sticky top-0 z-30">
        <div className="max-w-md sm:max-w-2xl mx-auto px-4 flex space-x-6">
          {(['perfil', 'reportes'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              type="button"
              className={
                tab === t
                  ? "py-3 text-[0.875rem] font-bold text-[#173A5F] relative flex items-center space-x-1.5 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[3px] after:bg-[#2D9E6B]"
                  : 'py-3 text-[0.875rem] font-medium text-[#73777f] hover:text-[#173A5F] transition-colors relative flex items-center space-x-1.5'
              }
            >
              <span>{t === 'perfil' ? 'Perfil' : 'Reportes'}</span>
              {t === 'reportes' && openReports > 0 && (
                <span className="text-[0.6875rem] font-semibold bg-[#F5F1E8] text-[#173A5F] px-1.5 py-0.5 rounded-full border border-[#c3c6cf]/30">{openReports}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-md sm:max-w-2xl mx-auto px-4 pt-4 pb-24 sm:pb-8 space-y-4">
        {isLoading ? (
          <p className="text-xs text-[#73777F]">Cargando...</p>
        ) : !tenant ? (
          <div className={`${card} text-center`}>
            <span className="material-symbols-outlined text-[36px] text-[#73777f]">link_off</span>
            <p className="text-xs text-[#43474E] mt-1">
              Tu cuenta aún no está vinculada a ningún contrato. Contacta al administrador si crees que esto es un error.
            </p>
          </div>
        ) : tab === 'perfil' ? (
          <>
            <section className={card}>
              <div className="flex items-center gap-3 pb-3 mb-2 border-b border-[#DDD9CF]/50">
                <div className="w-12 h-12 rounded-full bg-[#2D9E6B] text-white flex items-center justify-center font-bold text-sm">
                  {tenant.fullName
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h2 className="text-[0.95rem] font-bold text-[#173A5F] truncate">{tenant.fullName}</h2>
                  <span className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-[#2D9E6B] bg-[#2D9E6B]/10 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2D9E6B]"></span>
                    Inquilino activo
                  </span>
                </div>
              </div>
              <InfoRow icon="call" label="Teléfono" value={tenant.phone ?? '—'} />
              <InfoRow icon="mail" label="Email" value={tenant.email ?? '—'} />
              <InfoRow icon="badge" label="Identificación" value={tenant.idDocument ?? '—'} />
            </section>

            {tenant.currentProperty && (
              <section className={card}>
                <SectionHead icon="apartment" title="Mi propiedad" right={tenant.currentProperty.propertyType === 'HOUSE' ? 'Casa' : 'Local'} />
                <p className="text-[0.875rem] font-bold text-[#173A5F]">{tenant.currentProperty.name}</p>
                <p className="text-[0.75rem] text-[#43474E] flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[14px] text-[#73777F]">location_on</span>
                  {tenant.currentProperty.address}, {tenant.currentProperty.city}
                </p>
              </section>
            )}

            <section className={card}>
              <SectionHead icon="contract" title="Mi contrato" right={activeContract ? `${activeContract.durationMonths} meses` : undefined} />
              {activeContract ? (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="p-2.5 rounded bg-[#f7f3ea] border border-[#c3c6cf]/30">
                      <span className="text-[10px] font-medium text-[#73777f] block">Renta mensual</span>
                      <span className="text-headline-sm font-sans font-bold text-[#173A5F]">${Number(activeContract.monthlyRent).toLocaleString('es-MX')}</span>
                    </div>
                    <div className="p-2.5 rounded bg-[#f7f3ea] border border-[#c3c6cf]/30">
                      <span className="text-[10px] font-medium text-[#73777f] block">Depósito</span>
                      <span className="text-headline-sm font-sans font-bold text-[#173A5F]">${Number(activeContract.depositAmount).toLocaleString('es-MX')}</span>
                    </div>
                  </div>
                  <InfoRow
                    icon="date_range"
                    label="Vigencia"
                    value={`${formatDate(activeContract.startDate)} — ${activeContract.endDate ? formatDate(activeContract.endDate) : '—'}`}
                  />
                  <InfoRow icon="water_drop" label="Agua incluida" value={activeContract.waterIncluded ? 'Sí' : 'No'} />
                  <InfoRow icon="person" label="Representante" value={activeContract.representative?.fullName ?? '—'} />
                  <InfoRow icon="history_edu" label="Firmado" value={activeContract.signedAt ? formatDate(activeContract.signedAt) : 'Pendiente'} />
                  {activeContract.documentUrl && (
                    <button
                      onClick={() => handleDownloadContract(activeContract.id)}
                      disabled={downloadingId === activeContract.id}
                      className="mt-3 w-full h-11 rounded-lg bg-[#173A5F] hover:bg-[#122e4c] active:scale-[0.98] transition-all text-white font-semibold text-body-md flex items-center justify-center gap-2 disabled:opacity-50"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[20px]">download</span>
                      {downloadingId === activeContract.id ? 'Descargando...' : 'Descargar contrato PDF'}
                    </button>
                  )}
                </>
              ) : (
                <p className="text-xs text-[#73777F]">Aún no tienes un contrato registrado.</p>
              )}
            </section>

            {payments.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <div className={card}>
                  <span className="text-[0.6875rem] font-semibold text-[#73777F] uppercase tracking-wide">Puntualidad</span>
                  <p className="text-[#2D9E6B] font-bold text-2xl mt-0.5">{punctualityPercent}%</p>
                  <p className="text-[0.6875rem] text-[#73777F]">
                    {punctualPayments.length} de {paidPayments.length} pagos puntuales
                  </p>
                </div>
                <div className={card}>
                  <span className="text-[0.6875rem] font-semibold text-[#73777F] uppercase tracking-wide">Pagos totales</span>
                  <p className="text-[#173A5F] font-bold text-2xl mt-0.5">{paidPayments.length}</p>
                  <p className="text-[0.6875rem] text-[#73777F]">de {payments.length} registrados</p>
                </div>
              </div>
            )}

            {payments.length > 0 && (
              <section className={card}>
                <SectionHead icon="payments" title="Historial de pagos" />
                <div className="flex gap-1 bg-[#f1eee5] p-1 rounded-lg mb-3">
                  <button onClick={() => setPaymentSegment('pending')} className={segBtn(paymentSegment === 'pending')} type="button">
                    Por pagar {pendingPayments.length > 0 && `(${pendingPayments.length})`}
                  </button>
                  <button onClick={() => setPaymentSegment('paid')} className={segBtn(paymentSegment === 'paid')} type="button">
                    Pagados {paidPayments.length > 0 && `(${paidPayments.length})`}
                  </button>
                  <button onClick={() => setPaymentSegment('scheduled')} className={segBtn(paymentSegment === 'scheduled')} type="button">
                    Programados {scheduledPayments.length > 0 && `(${scheduledPayments.length})`}
                  </button>
                </div>
                {displayedPayments.length === 0 ? (
                  <p className="text-xs text-[#73777F] text-center py-6">
                    {paymentSegment === 'pending'
                      ? 'No hay pagos por pagar. ¡Felicidades!'
                      : paymentSegment === 'paid'
                        ? 'Aún no hay pagos registrados.'
                        : 'No hay pagos programados.'}
                  </p>
                ) : (
                  <div className="divide-y divide-[#DDD9CF]/50">
                    {displayedPayments.map((payment) => {
                      const overdue = payment.status === 'OVERDUE';
                      const badge =
                        paymentSegment === 'paid'
                          ? ['bg-[#2D9E6B]/15 text-[#2D9E6B]', 'Pagado']
                          : overdue
                            ? ['bg-red-100 text-red-700', 'Vencido']
                            : paymentSegment === 'scheduled'
                              ? ['bg-[#E8EFF6] text-[#173A5F]', 'Programado']
                              : ['bg-[#FEF3C7] text-[#B45309]', 'Próximo'];
                      return (
                        <div key={payment.id} className="flex items-center justify-between py-2.5">
                          <div>
                            <p className="text-[0.8125rem] font-semibold text-[#173A5F]">
                              {formatDate(paymentSegment === 'paid' ? payment.paidDate ?? payment.dueDate : payment.dueDate)}
                            </p>
                            <p className="text-[0.6875rem] text-[#73777F]">
                              ${Number(payment.amountDue).toLocaleString('es-MX')}
                              {payment.paymentNumber ? ` · ${payment.paymentNumber}/${payment.totalPaymentsInContract}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[0.6875rem] font-semibold ${badge[0]}`}>{badge[1]}</span>
                            {paymentSegment === 'paid' && (
                              <button
                                onClick={() => handleDownloadReceipt(payment.id)}
                                disabled={downloadingReceiptId === payment.id}
                                aria-label="Descargar recibo"
                                className="p-1 text-[#173A5F] hover:bg-[#f1eee5] rounded disabled:opacity-50"
                                type="button"
                              >
                                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </>
        ) : (
          <>
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="w-full bg-[#2D9E6B] text-white h-12 rounded-lg font-semibold text-[0.875rem] flex items-center justify-center space-x-2 active:scale-[0.99] hover:bg-[#26875b] transition-all"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span>Reportar incidencia</span>
            </button>
            <section className="bg-[#ffffff] rounded-lg p-3.5 border border-[#A7B0BB]/30 flex items-center justify-between">
              <div>
                <span className="text-[0.6875rem] font-semibold text-[#73777F] uppercase tracking-wide">Mantenimiento</span>
                <p className="text-[0.875rem] font-bold text-[#173A5F] mt-0.5">Seguimiento de Incidencias</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-center px-2.5 py-1 bg-[#F5F1E8] rounded-lg">
                  <span className="block text-[0.875rem] font-bold text-[#173A5F]">{openReports}</span>
                  <span className="block text-[0.625rem] text-[#73777F] font-medium">En curso</span>
                </div>
                <div className="text-center px-2.5 py-1 bg-[#F5F1E8] rounded-lg">
                  <span className="block text-[0.875rem] font-bold text-[#73777F]">{closedReports}</span>
                  <span className="block text-[0.625rem] text-[#73777F] font-medium">Cerrados</span>
                </div>
              </div>
            </section>
            {reports.length === 0 ? (
              <div className={`${card} text-center`}>
                <span className="material-symbols-outlined text-[36px] text-[#73777f]">task_alt</span>
                <p className="text-xs text-[#73777F] mt-1">No has reportado ninguna incidencia.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <ReportCard key={report.id} report={report} href={`/profile/reports/${report.id}`} showTenant={false} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Markup portado de Stitch: design/stitch/modal-report.html */}
      <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title="Reportar incidencia" subtitle="Asistencia y mantenimiento">
        <div className="space-y-4">
          {tenant?.currentProperty && (
            <div className="bg-[#F5F1E8] rounded-[8px] p-3 border border-[#A7B0BB]/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[20px] text-[#173A5F]">apartment</span>
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#73777f] tracking-wider">Inmueble asignado</div>
                  <div className="text-xs font-bold text-[#173A5F]">{tenant.currentProperty.name}</div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#2D9E6B] bg-white px-2 py-0.5 rounded-[8px] border border-[#A7B0BB]/30">
                <span className="material-symbols-outlined text-[13px] text-[#2D9E6B]">check_circle</span>
                <span>Detectada</span>
              </span>
            </div>
          )}
          <p className="text-xs text-slate-600 leading-relaxed">Describe el problema; el administrador recibirá una notificación y podrán conversar aquí mismo.</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#173A5F] flex items-center gap-1" htmlFor="descripcion-incidencia">
                <span>Descripción de la incidencia</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <span className="text-[11px] text-[#73777f]">{reportDescription.length} / 500</span>
            </div>
            <textarea
              id="descripcion-incidencia"
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Ej. El calentador no enciende desde el sábado"
              className="w-full text-xs text-slate-800 placeholder-slate-400 bg-white rounded-[8px] p-3 border border-[#A7B0BB] focus:border-[#173A5F] focus:ring-1 focus:ring-[#173A5F] focus:outline-none transition-all resize-none shadow-inner"
            />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button type="button" onClick={() => setIsReportModalOpen(false)} className={btnSecondary}>
              Cancelar
            </button>
            <button type="button" onClick={handleSubmitReport} disabled={isSubmittingReport || !reportDescription.trim()} className={btnConfirm}>
              <span className="material-symbols-outlined text-[18px]">send</span>
              {isSubmittingReport ? 'Enviando...' : 'Enviar reporte'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-[#f1eee5] last:border-0 gap-3 text-[0.75rem]">
      <span className="text-[#43474e] flex items-center gap-1.5 whitespace-nowrap">
        <span className="material-symbols-outlined text-[15px] text-[#73777f]">{icon}</span>
        {label}
      </span>
      <span className="font-semibold text-[#1c1c16] text-right truncate">{value}</span>
    </div>
  );
}

function SectionHead({ icon, title, right }: { icon: string; title: string; right?: string }) {
  return (
    <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#f1eee5]">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[#173A5F] text-[20px]">{icon}</span>
        <h2 className="text-label-lg font-sans text-[#173A5F]">{title}</h2>
      </div>
      {right && <span className="text-label-sm font-sans text-[#73777f]">{right}</span>}
    </div>
  );
}

// El admin no tiene portal propio: su "perfil" vive en Más y Configuración.
export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (user?.role === 'ADMIN') router.replace('/settings');
  }, [user?.role, router]);
  return user?.role === 'ADMIN' ? null : <TenantProfile />;
}
