'use client';

// Markup portado de Stitch: design/stitch/dashboard.html (admin) y tenant-home.html (inquilino).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  dashboardApi,
  DashboardStats,
  PaymentStats,
  meApi,
  MyTenant,
  RentPayment,
  Contract,
  contractsApi,
  ContractRenewalAlert,
  rentPaymentsApi,
  buildWhatsAppReminderUrl,
} from '@/lib/api';
import { formatDate } from '@/lib/formatDate';
import { useToast } from '@/components/ToastProvider';
import { MainHeader } from '@/components/StitchHeader';

const money = (n: number | string) => `$${Number(n).toLocaleString('es-MX')}`;
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const daysTo = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
const currentPeriod = () => {
  const d = new Date();
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

function Kpi({ label, icon, iconClass, value, footer }: { label: string; icon: string; iconClass: string; value: string | number; footer: React.ReactNode }) {
  return (
    <div className="bg-white p-3.5 rounded-[8px] border border-[#DDD9CF] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-[#73777f] font-sans">{label}</span>
        <div className={`w-8 h-8 rounded-[8px] bg-[#F5F1E8] flex items-center justify-center ${iconClass}`}>
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold font-sans text-[#173A5F] tracking-tight">{value}</div>
        {footer}
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { token, user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null);
  const [renewalAlerts, setRenewalAlerts] = useState<ContractRenewalAlert[]>([]);
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [activeContracts, setActiveContracts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      dashboardApi.stats(token),
      dashboardApi.paymentStats(token),
      contractsApi.getRenewalAlerts(token),
      rentPaymentsApi.list(token),
      contractsApi.list(token),
    ])
      .then(([s, ps, alerts, pays, contracts]) => {
        setStats(s);
        setPaymentStats(ps);
        setRenewalAlerts(alerts);
        setPayments(pays);
        setActiveContracts(contracts.filter((c) => c.status === 'ACTIVE').length);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  // Próximos cobros: los pendientes más cercanos (vencidos primero) + lo pagado más reciente.
  const upcoming = [...payments]
    .filter((p) => p.status !== 'PAID')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 4);

  const occupancy = stats && stats.properties.total > 0 ? Math.round((stats.properties.ocupada / stats.properties.total) * 100) : 0;

  return (
    <>
      <MainHeader>
        {/* User Greeting Bar */}
        <div className="flex items-center justify-between pt-3.5 mt-2 border-t border-white/10 sm:mt-0 sm:pt-0 sm:border-0">
          <div>
            <h1 className="font-sans font-bold text-lg text-white leading-tight tracking-tight">Hola, {user?.firstName}</h1>
            <p className="text-xs text-[#73777f] flex items-center gap-1 font-medium mt-0.5">
              <span>Administrador</span>
              <span className="text-[8px] text-[#73777f]">•</span>
              <span className="text-[#2D9E6B] font-semibold">Panel Principal</span>
            </p>
          </div>
          {/* Period Indicator */}
          <div className="bg-white/10 px-2.5 py-1.5 rounded-[8px] border border-white/10 flex items-center gap-1.5 text-xs text-white font-medium">
            <span className="material-symbols-outlined text-[15px] text-[#2D9E6B]">calendar_today</span>
            <span className="font-sans text-[11px] font-semibold">{currentPeriod()}</span>
          </div>
        </div>
      </MainHeader>

      <main className="max-w-md sm:max-w-5xl mx-auto w-full px-4 pt-4 flex-1 pb-6">
        {/* QUICK ACTION BUTTONS */}
        <section className="grid grid-cols-2 gap-3 mb-5">
          <Link
            href="/properties"
            className="flex items-center justify-center gap-2 bg-[#173A5F] text-white py-2.5 px-3 rounded-[8px] font-sans font-semibold text-xs hover:bg-[#122e4d] active:scale-[0.99] transition duration-150 border border-[#173A5F]"
          >
            <span className="material-symbols-outlined text-base text-[#2D9E6B]">add_business</span>
            <span>+ Nueva propiedad</span>
          </Link>
          <Link
            href="/payments"
            className="flex items-center justify-center gap-2 bg-[#2D9E6B] text-white py-2.5 px-3 rounded-[8px] font-sans font-semibold text-xs hover:bg-[#25855a] active:scale-[0.99] transition duration-150 border border-[#2D9E6B]"
          >
            <span className="material-symbols-outlined text-base text-white">payments</span>
            <span>+ Registrar pago</span>
          </Link>
        </section>

        {isLoading ? (
          <p className="text-xs text-[#73777f]">Cargando estadísticas...</p>
        ) : !stats ? (
          <p className="text-xs text-[#73777f]">No se pudieron cargar las estadísticas.</p>
        ) : (
          <>
            {/* METRICS & KPIS */}
            <section className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-sans font-bold text-xs uppercase tracking-wider text-[#173A5F]">Resumen operativo</h2>
                <span className="text-[11px] text-[#73777f] font-medium">Actualizado hoy</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Kpi
                  label="Propiedades"
                  icon="domain"
                  iconClass="text-[#173A5F]"
                  value={stats.properties.total}
                  footer={
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#2D9E6B]">
                      <span className="material-symbols-outlined text-[14px]">trending_up</span>
                      <span>{occupancy}% ocupación</span>
                    </div>
                  }
                />
                <Kpi
                  label="Inquilinos"
                  icon="group"
                  iconClass="text-[#173A5F]"
                  value={stats.activeTenants}
                  footer={
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[#2D9E6B]">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      <span>Activos</span>
                    </div>
                  }
                />
                <Kpi
                  label="Ingresos mes"
                  icon="account_balance_wallet"
                  iconClass="text-[#2D9E6B]"
                  value={money(paymentStats?.thisMonthPaid ?? 0)}
                  footer={
                    paymentStats && paymentStats.totalOverdue > 0 ? (
                      <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-red-600">
                        <span className="material-symbols-outlined text-[14px]">error</span>
                        <span>{money(paymentStats.totalOverdue)} vencido</span>
                      </div>
                    ) : (
                      <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#2D9E6B]">
                        <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                        <span>Sin vencidos</span>
                      </div>
                    )
                  }
                />
                <Kpi
                  label="Contratos"
                  icon="description"
                  iconClass="text-[#173A5F]"
                  value={activeContracts}
                  footer={
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-amber-700">
                      <span className="material-symbols-outlined text-[14px] text-amber-600">event_repeat</span>
                      <span>{renewalAlerts.length} por renovar</span>
                    </div>
                  }
                />
              </div>
            </section>

            {/* SECTION: PAGOS PRÓXIMOS */}
            <section className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <h2 className="font-sans font-bold text-base text-[#173A5F]">Pagos próximos</h2>
                  <span className="bg-[#173A5F]/10 text-[#173A5F] font-sans text-[11px] font-bold px-2 py-0.5 rounded-[6px]">{upcoming.length}</span>
                </div>
                <Link className="text-xs font-semibold text-[#2D9E6B] hover:text-[#25855a] flex items-center gap-0.5 font-sans" href="/payments">
                  <span>Ver todos</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
              {upcoming.length === 0 ? (
                <div className="bg-white rounded-[8px] border border-[#DDD9CF] p-4 text-xs text-[#73777f]">No hay pagos pendientes.</div>
              ) : (
                <div className="space-y-2.5">
                  {upcoming.map((p) => {
                    const overdue = p.status === 'OVERDUE';
                    return (
                      <article key={p.id} className="bg-white rounded-[8px] border border-[#DDD9CF] p-3.5 transition-all">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <span className="font-sans font-bold text-sm text-[#173A5F] block">{p.property?.name ?? '—'}</span>
                            <p className="text-xs text-[#73777f] font-medium flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">person</span>
                              <span className="text-[#173A5F]/80">{p.tenant?.fullName ?? '—'}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-sans font-bold text-sm text-[#173A5F] block">{money(p.amountDue)}</span>
                            {overdue ? (
                              <span className="inline-flex items-center text-[10px] font-sans font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-[4px] mt-1">
                                Vencido
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] font-sans font-bold text-amber-800 bg-[#F5F1E8] border border-[#DDD9CF] px-2 py-0.5 rounded-[4px] mt-1">
                                Próximo
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-[#F5F1E8] flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 text-[#173A5F]/80 font-medium">
                            <span className={`material-symbols-outlined text-[13px] ${overdue ? 'text-red-600' : 'text-amber-600'}`}>schedule</span>
                            <span>Vence: {formatDate(p.dueDate)}</span>
                          </span>
                          <button
                            onClick={() => window.open(buildWhatsAppReminderUrl(p), '_blank')}
                            className="bg-[#F5F1E8] hover:bg-[#173A5F] hover:text-white text-[#173A5F] border border-[#DDD9CF] text-[11px] font-sans font-semibold px-2 py-1 rounded-[6px] flex items-center gap-1 transition-colors"
                          >
                            <span>Enviar recordatorio</span>
                            <span className="material-symbols-outlined text-[12px]">send</span>
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Contratos por renovar — mismo tratamiento de tarjeta de alerta que Stitch */}
            {renewalAlerts.length > 0 && (
              <section className="mb-4 bg-white rounded-[8px] border border-[#DDD9CF] border-l-4 border-l-amber-500 p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-sans font-bold text-sm text-[#173A5F]">Contratos por renovar</h2>
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-[4px]">{renewalAlerts.length}</span>
                </div>
                <div className="divide-y divide-[#F5F1E8]">
                  {renewalAlerts.slice(0, 3).map((a) => (
                    <Link key={a.id} href={`/contracts/${a.id}`} className="flex items-center justify-between py-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#173A5F] truncate">{a.tenant.fullName}</p>
                        <p className="text-[11px] text-[#73777f] truncate">{a.property.name}</p>
                      </div>
                      <span className="text-[11px] font-semibold text-amber-700 shrink-0">En {a.daysUntilEnd} d</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}

function TenantDashboard() {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const [tenant, setTenant] = useState<MyTenant | null | undefined>(undefined);
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([meApi.getTenant(token), meApi.getPayments(token), meApi.getContracts(token)])
      .then(([t, p, c]) => {
        setTenant(t);
        setPayments(p);
        setContract(c.find((x) => x.status === 'ACTIVE') ?? null);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const handleDownloadReceipt = async (id: string) => {
    if (!token) return;
    setDownloadingId(id);
    try {
      await meApi.downloadReceipt(id, token);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al descargar el recibo', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const nextPayment = payments
    .filter((p) => p.status !== 'PAID')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
  const recentPayments = payments
    .filter((p) => p.status === 'PAID')
    .sort((a, b) => new Date(b.paidDate ?? b.dueDate).getTime() - new Date(a.paidDate ?? a.dueDate).getTime())
    .slice(0, 3);

  return (
    <>
      <MainHeader>
        {/* Welcome Banner inside Navy Container */}
        <div className="pt-4 relative overflow-hidden">
          <div className="absolute -right-8 -bottom-10 w-36 h-36 opacity-10 pointer-events-none transform rotate-45">
            <div className="w-full h-full bg-[#2D9E6B]"></div>
          </div>
          {contract && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#2D9E6B]/20 text-[#2D9E6B] border border-[#2D9E6B]/30 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2D9E6B]"></span>
              <span className="text-[10px] font-semibold tracking-wide uppercase">Contrato Activo</span>
            </div>
          )}
          <h1 className="font-sans text-2xl font-bold text-white tracking-tight">Bienvenido, {user?.firstName}</h1>
          {tenant?.currentProperty && (
            <p className="text-xs font-medium text-white/75 mt-0.5 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-[#2D9E6B]">apartment</span>
              Inquilino · {tenant.currentProperty.name}
            </p>
          )}
        </div>
      </MainHeader>

      <main className="max-w-md sm:max-w-5xl mx-auto flex-1 px-4 pt-4 pb-6 space-y-4">
        {isLoading ? (
          <p className="text-xs text-[#73777f]">Cargando...</p>
        ) : !tenant ? (
          <section className="bg-white rounded-lg border border-[#A7B0BB]/30 p-4 text-xs text-[#73777f]">
            Tu cuenta aún no está vinculada a ningún contrato de arrendamiento. Contacta al administrador si crees que esto es un error.
          </section>
        ) : (
          <>
            {/* Featured Card: Próximo pago */}
            <section className="bg-white rounded-lg border border-[#A7B0BB]/30 p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#2D9E6B]"></div>
              <div className="flex items-center justify-between mb-3 pt-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-[#2D9E6B]/10 text-[#2D9E6B] rounded-lg">
                    <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#173A5F]">Próximo vencimiento de renta</span>
                </div>
                {nextPayment?.status === 'OVERDUE' ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-red-50 text-red-700">Vencido</span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-[#2D9E6B]/15 text-[#2D9E6B]">Al corriente</span>
                )}
              </div>
              {nextPayment ? (
                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-[#173A5F] tracking-tight font-sans">{money(nextPayment.amountDue)}</span>
                    <span className="text-xs font-semibold text-[#73777f]">MXN</span>
                  </div>
                  <p className="text-xs text-[#73777f] mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-[#73777f]">schedule</span>
                    Vence: <strong className="text-[#173A5F] font-semibold">{formatDate(nextPayment.dueDate)}</strong>
                    {daysTo(nextPayment.dueDate) >= 0 && ` (en ${daysTo(nextPayment.dueDate)} días)`}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[#73777f] mb-4">Estás al corriente con tus pagos.</p>
              )}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#A7B0BB]/20">
                <Link
                  href="/profile"
                  className="w-full bg-[#2D9E6B] hover:bg-[#258257] active:scale-95 transition-all text-white font-semibold text-xs py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                  Mis pagos
                </Link>
                <Link
                  href="/profile?tab=reportes"
                  className="w-full bg-white hover:bg-[#F5F1E8] border border-[#A7B0BB] active:scale-95 transition-all text-[#173A5F] font-semibold text-xs py-2.5 px-2 rounded-lg flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#173A5F]">build</span>
                  Reportar incidencia
                </Link>
              </div>
            </section>

            {/* Section: Mi Contrato */}
            {contract && (
              <section className="bg-white rounded-lg border border-[#A7B0BB]/30 p-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#A7B0BB]/20 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#173A5F] text-[20px]">description</span>
                    <h2 className="text-xs font-bold text-[#173A5F] tracking-tight">Mi contrato</h2>
                  </div>
                  <Link href="/profile" className="text-xs font-semibold text-[#173A5F] hover:text-[#2D9E6B] flex items-center gap-0.5">
                    Ver detalle
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </Link>
                </div>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#73777f]">Inmueble arrendado</span>
                    <span className="font-semibold text-[#173A5F] text-right">{contract.property?.name ?? tenant.currentProperty?.name ?? '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#73777f]">Vigencia</span>
                    <span className="font-semibold text-[#173A5F] text-right">
                      {formatDate(contract.startDate)} – {contract.endDate ? formatDate(contract.endDate) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#73777f]">Renta acordada</span>
                    <span className="font-semibold text-[#173A5F]">{money(contract.monthlyRent)} MXN / mes</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#73777f]">Depósito en garantía</span>
                    <span className="font-semibold text-[#173A5F]">{money(contract.depositAmount)} MXN</span>
                  </div>
                </div>
              </section>
            )}

            {/* Section: Pagos Recientes */}
            <section className="bg-white rounded-lg border border-[#A7B0BB]/30 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#173A5F] text-[20px]">history</span>
                  <h2 className="text-xs font-bold text-[#173A5F] uppercase tracking-wider">Pagos recientes</h2>
                </div>
                <Link className="text-[11px] font-semibold text-[#173A5F] hover:text-[#2D9E6B] transition-colors" href="/profile">
                  Ver historial
                </Link>
              </div>
              {recentPayments.length === 0 ? (
                <p className="text-xs text-[#73777f]">No hay pagos registrados todavía.</p>
              ) : (
                <div className="divide-y divide-[#A7B0BB]/20">
                  {recentPayments.map((p) => (
                    <div key={p.id} className="py-3 flex items-center justify-between first:pt-0">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#2D9E6B]/10 flex items-center justify-center text-[#2D9E6B] mt-0.5 flex-shrink-0">
                          <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#173A5F]">
                            {p.paymentType === 'DEPOSIT' ? 'Depósito' : `Renta ${p.paymentNumber ? `${p.paymentNumber}/${p.totalPaymentsInContract}` : ''}`}
                          </p>
                          <p className="text-[11px] text-[#73777f]">Pagado el {formatDate(p.paidDate ?? p.dueDate)}</p>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 bg-[#2D9E6B]/15 text-[#2D9E6B] text-[9px] font-bold rounded-lg">Pagado</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="text-xs font-bold text-[#173A5F]">{money(p.amountDue)} MXN</span>
                        <button
                          onClick={() => handleDownloadReceipt(p.id)}
                          disabled={downloadingId === p.id}
                          className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[#173A5F] hover:text-[#2D9E6B] active:scale-95 transition-transform bg-[#F5F1E8] px-2 py-1 rounded disabled:opacity-50"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[13px]">file_download</span>
                          {downloadingId === p.id ? '...' : 'Recibo'}
                        </button>
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

export default function DashboardPage() {
  const { user } = useAuth();
  return user?.role === 'ADMIN' ? <AdminDashboard /> : <TenantDashboard />;
}
