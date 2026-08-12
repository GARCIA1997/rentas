'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { dashboardApi, DashboardStats, MonthlyIncome, PaymentStats, meApi, MyTenant, RentPayment, contractsApi, ContractRenewalAlert } from '@/lib/api';
import { formatDate } from '@/lib/formatDate';
import { ChevronRightIcon } from '@/components/icons';
import { useToast } from '@/components/ToastProvider';

const STATUS_COLORS: Record<string, string> = {
  Ocupada: '#0d9488',
  Libre: '#64748b',
  Mantenimiento: '#f59e0b',
};

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-surface rounded-2xl shadow-sm p-5">
      <p className="text-sm text-muted mb-1">{label}</p>
      <p className="text-3xl font-bold text-heading">{value}</p>
    </div>
  );
}

function AdminDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [income, setIncome] = useState<MonthlyIncome[]>([]);
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null);
  const [renewalAlerts, setRenewalAlerts] = useState<ContractRenewalAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      dashboardApi.stats(token),
      dashboardApi.income(token),
      dashboardApi.paymentStats(token),
      contractsApi.getRenewalAlerts(token),
    ])
      .then(([statsData, incomeData, paymentStatsData, alertsData]) => {
        setStats(statsData);
        setIncome(incomeData);
        setPaymentStats(paymentStatsData);
        setRenewalAlerts(alertsData);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  if (isLoading) {
    return <p className="text-muted">Cargando estadísticas...</p>;
  }

  if (!stats) {
    return <p className="text-muted">No se pudieron cargar las estadísticas.</p>;
  }

  const chartData = [
    { name: 'Ocupada', value: stats.properties.ocupada },
    { name: 'Libre', value: stats.properties.libre },
    { name: 'Mantenimiento', value: stats.properties.mantenimiento },
  ].filter((d) => d.value > 0);

  const totalIncome = income.reduce((sum, m) => sum + m.total, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Propiedades totales" value={stats.properties.total} />
        <StatCard label="Inquilinos activos" value={stats.activeTenants} />
        <StatCard label="Ocupadas" value={stats.properties.ocupada} />
        <StatCard label="Libres" value={stats.properties.libre} />
      </div>

      <div className="bg-surface rounded-2xl shadow-sm p-5">
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="text-heading font-semibold">Ingresos mensuales</h3>
          <span className="text-sm text-muted">Últimos 6 meses: ${totalIncome.toLocaleString('es-MX')}</span>
        </div>
        {totalIncome === 0 ? (
          <p className="text-muted text-sm">Aún no se han registrado pagos.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={income}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-black/5 dark:stroke-white/10" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} width={50} />
              <Tooltip formatter={(value) => `$${Number(value).toLocaleString('es-MX')}`} />
              <Bar dataKey="total" fill="#0d9488" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-2xl shadow-sm p-5">
          <h3 className="text-heading font-semibold mb-4">Propiedades por estado</h3>
          {chartData.length === 0 ? (
            <p className="text-muted text-sm">Sin propiedades registradas todavía.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-surface rounded-2xl shadow-sm p-5">
          <h3 className="text-heading font-semibold mb-4">Resumen</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between">
              <span className="text-muted">En mantenimiento</span>
              <span className="text-heading font-medium">{stats.properties.mantenimiento}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted">Representantes activos</span>
              <span className="text-heading font-medium">{stats.activeRepresentatives}</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Payment Stats Widget */}
      {paymentStats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl shadow-sm p-5 border border-red-200 dark:border-red-800">
            <p className="text-sm text-muted mb-1">Total vencido</p>
            <p className="text-3xl font-bold text-heading">${paymentStats.totalOverdue.toLocaleString('es-MX')}</p>
            <Link href="/payments" className="text-red-600 dark:text-red-400 text-xs font-medium mt-2 inline-block hover:underline">
              Ver pagos vencidos →
            </Link>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl shadow-sm p-5 border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-muted mb-1">Próximos a vencer (7d)</p>
            <p className="text-3xl font-bold text-heading">${paymentStats.totalUpcoming.toLocaleString('es-MX')}</p>
            <Link href="/payments" className="text-amber-600 dark:text-amber-400 text-xs font-medium mt-2 inline-block hover:underline">
              Ver próximos →
            </Link>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl shadow-sm p-5 border border-emerald-200 dark:border-emerald-800">
            <p className="text-sm text-muted mb-1">Pagado este mes</p>
            <p className="text-3xl font-bold text-heading">${paymentStats.thisMonthPaid.toLocaleString('es-MX')}</p>
            <p className="text-emerald-600 dark:text-emerald-400 text-xs font-medium mt-2">Colecciones del mes</p>
          </div>
        </div>
      )}

      {/* Renewal Alerts Widget */}
      {renewalAlerts.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl shadow-sm p-5 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-heading font-semibold">⚠️ Contratos a renovar</h3>
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">{renewalAlerts.length}</span>
          </div>
          <div className="space-y-2">
            {renewalAlerts.slice(0, 3).map((alert) => (
              <Link
                key={alert.id}
                href={`/contracts/${alert.id}`}
                className="flex items-center justify-between p-3 bg-white dark:bg-black/20 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-heading">{alert.tenant.fullName}</p>
                  <p className="text-xs text-muted">{alert.property.name}</p>
                </div>
                <div className="text-right ml-2">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">En {alert.daysUntilEnd}d</p>
                </div>
              </Link>
            ))}
          </div>
          <Link href="/contracts" className="text-amber-600 dark:text-amber-400 text-xs font-medium mt-3 inline-block hover:underline">
            Ver todos →
          </Link>
        </div>
      )}

      {/* Properties with Most Overdue */}
      {paymentStats && paymentStats.propertiesWithMostOverdue.length > 0 && (
        <div className="bg-surface rounded-2xl shadow-sm p-5">
          <h3 className="text-heading font-semibold mb-4">Propiedades con pagos vencidos</h3>
          <div className="space-y-2">
            {paymentStats.propertiesWithMostOverdue.map((prop) => (
              <div key={prop.propertyId} className="flex items-center justify-between py-2 border-b border-black/5 dark:border-white/10 last:border-0">
                <div>
                  <p className="text-heading font-medium text-sm">{prop.propertyName}</p>
                  <p className="text-muted text-xs">{prop.overdueCount} pagos vencidos</p>
                </div>
                <p className="text-red-600 dark:text-red-400 font-medium text-sm">${prop.overdueAmount.toLocaleString('es-MX')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const paymentStatusLabels: Record<RentPayment['status'], string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  OVERDUE: 'Vencido',
};

const paymentStatusColors: Record<RentPayment['status'], string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  PAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  OVERDUE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

function TenantDashboard() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [tenant, setTenant] = useState<MyTenant | null | undefined>(undefined);
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    Promise.all([meApi.getTenant(token), meApi.getPayments(token)])
      .then(([tenantData, paymentsData]) => {
        setTenant(tenantData);
        setPayments(paymentsData);
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

  if (isLoading) {
    return <p className="text-muted">Cargando...</p>;
  }

  if (!tenant) {
    return (
      <div className="bg-surface rounded-2xl shadow-sm p-6">
        <p className="text-muted">
          Tu cuenta aún no está vinculada a ningún contrato de arrendamiento. Contacta al administrador
          si crees que esto es un error.
        </p>
      </div>
    );
  }

  const nextPayment = payments
    .filter((p) => p.status !== 'PAID')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  // El inicio es un resumen, no el historial completo — sólo los 3 pagos ya
  // realizados más recientes, con un link a /profile para ver todo (ahí vive el
  // historial completo con los tabs Por pagar/Pagados/Programados).
  const recentPayments = payments
    .filter((p) => p.status === 'PAID')
    .sort((a, b) => new Date(b.paidDate ?? b.dueDate).getTime() - new Date(a.paidDate ?? a.dueDate).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <Link
        href="/profile"
        className="flex items-center justify-between bg-surface rounded-2xl shadow-sm p-5 active:opacity-70 transition-opacity"
      >
        <div>
          <p className="text-sm text-muted mb-0.5">Mi contrato</p>
          <p className="text-heading font-semibold">{tenant.currentProperty?.name ?? 'Ver detalle'}</p>
        </div>
        <ChevronRightIcon className="w-5 h-5 text-muted shrink-0" />
      </Link>

      <div className="bg-surface rounded-2xl shadow-sm p-5">
        <h3 className="text-heading font-semibold mb-4">Próximo pago</h3>
        {nextPayment ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Vencimiento</span>
              <span className="text-heading font-medium">{formatDate(nextPayment.dueDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Monto</span>
              <span className="text-heading font-medium">
                ${Number(nextPayment.amountDue).toLocaleString('es-MX')}
              </span>
            </div>
            <span
              className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${paymentStatusColors[nextPayment.status]}`}
            >
              {paymentStatusLabels[nextPayment.status]}
            </span>
          </div>
        ) : (
          <p className="text-muted text-sm">Estás al corriente con tus pagos.</p>
        )}
      </div>

      <div className="bg-surface rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-5 pb-3">
          <h3 className="text-heading font-semibold">Pagos recientes</h3>
          {payments.length > 0 && (
            <Link href="/profile" className="text-primary text-sm font-medium">
              Ver todo
            </Link>
          )}
        </div>
        {recentPayments.length === 0 ? (
          <p className="text-muted text-sm px-5 pb-5">No hay pagos registrados todavía.</p>
        ) : (
          <div className="divide-y divide-black/5 dark:divide-white/10">
            {recentPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-heading text-sm font-medium">
                    {formatDate(payment.paidDate ?? payment.dueDate)}
                  </p>
                  <p className="text-muted text-xs">${Number(payment.amountDue).toLocaleString('es-MX')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${paymentStatusColors[payment.status]}`}
                  >
                    {paymentStatusLabels[payment.status]}
                  </span>
                  <button
                    onClick={() => handleDownloadReceipt(payment.id)}
                    disabled={downloadingId === payment.id}
                    className="text-primary text-sm font-medium disabled:opacity-50"
                  >
                    {downloadingId === payment.id ? '...' : 'Recibo'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h2 className="text-2xl font-bold text-heading mb-6">Bienvenido, {user?.firstName}</h2>
      {user?.role === 'ADMIN' ? <AdminDashboard /> : <TenantDashboard />}
    </div>
  );
}
