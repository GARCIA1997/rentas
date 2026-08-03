'use client';

import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminNavbar } from '@/components/AdminNavbar';
import { useAuth } from '@/hooks/useAuth';
import { dashboardApi, DashboardStats } from '@/lib/api';

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

function TenantDashboard() {
  const { user } = useAuth();
  return (
    <div className="bg-surface rounded-lg shadow p-6">
      <p className="text-muted">
        Bienvenido {user?.firstName}. Aquí podrás ver tu contrato y tus pagos próximamente.
      </p>
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
