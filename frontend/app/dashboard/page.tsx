'use client';

import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminNavbar } from '@/components/AdminNavbar';
import { useAuth } from '@/hooks/useAuth';
import { dashboardApi, DashboardStats, meApi, MyTenant, Contract, RentPayment } from '@/lib/api';
import { formatDate } from '@/lib/formatDate';

const STATUS_COLORS: Record<string, string> = {
  Ocupada: '#0d9488',
  Libre: '#64748b',
  Mantenimiento: '#f59e0b',
};

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-surface rounded-lg shadow p-6">
      <p className="text-sm text-muted mb-1">{label}</p>
      <p className="text-3xl font-bold text-heading">{value}</p>
    </div>
  );
}

function AdminDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    dashboardApi
      .stats(token)
      .then(setStats)
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Propiedades totales" value={stats.properties.total} />
        <StatCard label="Inquilinos activos" value={stats.activeTenants} />
        <StatCard label="Ocupadas" value={stats.properties.ocupada} />
        <StatCard label="Libres" value={stats.properties.libre} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-lg shadow p-6">
          <h3 className="text-heading font-semibold mb-4">Propiedades por estado</h3>
          {chartData.length === 0 ? (
            <p className="text-muted text-sm">Sin propiedades registradas todavía.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
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

        <div className="bg-surface rounded-lg shadow p-6">
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
          <p className="text-xs text-muted mt-4">
            Los reportes de ingresos y pagos estarán disponibles cuando se registren contratos y recibos.
          </p>
        </div>
      </div>
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
  const [tenant, setTenant] = useState<MyTenant | null | undefined>(undefined);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [tenantData, contractsData, paymentsData] = await Promise.all([
        meApi.getTenant(token),
        meApi.getContracts(token),
        meApi.getPayments(token),
      ]);
      setTenant(tenantData);
      setContracts(contractsData);
      setPayments(paymentsData);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleDownloadContract = async (id: string) => {
    if (!token) return;
    setDownloadingId(id);
    try {
      await meApi.downloadContractPdf(id, token);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al descargar el contrato');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadReceipt = async (id: string) => {
    if (!token) return;
    setDownloadingId(id);
    try {
      await meApi.downloadReceipt(id, token);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al descargar el recibo');
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) {
    return <p className="text-muted">Cargando...</p>;
  }

  if (!tenant) {
    return (
      <div className="bg-surface rounded-lg shadow p-6">
        <p className="text-muted">
          Tu cuenta aún no está vinculada a ningún contrato de arrendamiento. Contacta al administrador
          si crees que esto es un error.
        </p>
      </div>
    );
  }

  const activeContract = contracts.find((c) => c.status === 'ACTIVE') ?? contracts[0];
  const nextPayment = payments
    .filter((p) => p.status !== 'PAID')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-lg shadow p-6">
        <h3 className="text-heading font-semibold mb-4">Mi propiedad</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted">Propiedad</p>
            <p className="text-heading font-medium">{tenant.property.name}</p>
          </div>
          <div>
            <p className="text-muted">Dirección</p>
            <p className="text-heading font-medium">
              {tenant.property.address}, {tenant.property.city}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-lg shadow p-6">
          <h3 className="text-heading font-semibold mb-4">Mi contrato</h3>
          {activeContract ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Vigencia</span>
                <span className="text-heading font-medium">
                  {formatDate(activeContract.startDate)} — {formatDate(activeContract.endDate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Renta mensual</span>
                <span className="text-heading font-medium">
                  ${Number(activeContract.monthlyRent).toLocaleString('es-MX')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Agua incluida</span>
                <span className="text-heading font-medium">{activeContract.waterIncluded ? 'Sí' : 'No'}</span>
              </div>
              {activeContract.documentUrl && (
                <button
                  onClick={() => handleDownloadContract(activeContract.id)}
                  disabled={downloadingId === activeContract.id}
                  className="mt-3 w-full bg-primary hover:bg-primary-pressed text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {downloadingId === activeContract.id ? 'Descargando...' : 'Descargar contrato PDF'}
                </button>
              )}
            </div>
          ) : (
            <p className="text-muted text-sm">Aún no tienes un contrato registrado.</p>
          )}
        </div>

        <div className="bg-surface rounded-lg shadow p-6">
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
      </div>

      <div className="bg-surface rounded-lg shadow overflow-hidden overflow-x-auto">
        <h3 className="text-heading font-semibold p-6 pb-0">Historial de pagos</h3>
        {payments.length === 0 ? (
          <p className="text-muted text-sm p-6">No hay pagos registrados todavía.</p>
        ) : (
          <table className="w-full text-sm mt-4">
            <thead className="bg-canvas text-muted text-left">
              <tr>
                <th className="px-6 py-3 font-medium">Vencimiento</th>
                <th className="px-6 py-3 font-medium">Monto</th>
                <th className="px-6 py-3 font-medium">Estado</th>
                <th className="px-6 py-3 font-medium text-right">Recibo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/10">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-6 py-3 text-muted whitespace-nowrap">{formatDate(payment.dueDate)}</td>
                  <td className="px-6 py-3 text-muted">${Number(payment.amountDue).toLocaleString('es-MX')}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${paymentStatusColors[payment.status]}`}
                    >
                      {paymentStatusLabels[payment.status]}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    {payment.status === 'PAID' && (
                      <button
                        onClick={() => handleDownloadReceipt(payment.id)}
                        disabled={downloadingId === payment.id}
                        className="text-primary hover:underline disabled:opacity-50"
                      >
                        {downloadingId === payment.id ? 'Descargando...' : 'Descargar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-canvas">
        <AdminNavbar />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-2xl font-bold text-heading mb-6">Bienvenido, {user?.firstName}</h2>

          {user?.role === 'ADMIN' ? <AdminDashboard /> : <TenantDashboard />}
        </main>
      </div>
    </ProtectedRoute>
  );
}
