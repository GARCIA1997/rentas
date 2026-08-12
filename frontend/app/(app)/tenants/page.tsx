'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { tenantsApi, Tenant } from '@/lib/api';
import { ChevronRightIcon } from '@/components/icons';

const statusLabels: Record<Tenant['status'], string> = {
  ACTIVE: 'Activo',
  EVICTED: 'Desalojado',
  MOVED_OUT: 'Mudanza',
};

const statusColors: Record<Tenant['status'], string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  EVICTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  MOVED_OUT: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export default function TenantsPage() {
  const { token } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      setTenants(await tenantsApi.list(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar inquilinos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-heading">Inquilinos</h1>
        <Link
          href="/tenants/new"
          className="bg-primary hover:bg-primary-pressed text-white px-4 py-2.5 rounded-xl text-sm font-medium self-start sm:self-auto active:opacity-80"
        >
          + Nuevo inquilino
        </Link>
      </div>
      <p className="text-sm text-muted -mt-4 mb-6">
        Escanea el INE para llenar los datos automáticamente, o captúralos a mano. La propiedad y la fecha de
        ingreso se asignan al crear su contrato. Toca un inquilino para ver su perfil completo, editarlo o
        eliminarlo.
      </p>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-800 dark:text-red-400 mb-6">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="text-muted">Cargando...</p>
      ) : tenants.length === 0 ? (
        <div className="bg-surface rounded-2xl p-8 text-center text-muted">No hay inquilinos registrados.</div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="sm:hidden space-y-3">
            {tenants.map((tenant) => {
              const currentProperty = tenant.contracts?.[0]?.property;
              return (
                <Link
                  key={tenant.id}
                  href={`/tenants/${tenant.id}/profile`}
                  className="flex items-center gap-3 bg-surface rounded-2xl shadow-sm p-4 active:opacity-70 transition-opacity"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-heading font-semibold truncate">{tenant.fullName}</p>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[tenant.status]}`}>
                        {statusLabels[tenant.status]}
                      </span>
                    </div>
                    <p className="text-muted text-sm truncate">{tenant.phone || 'Sin teléfono'}</p>
                    {currentProperty && (
                      <p className="text-xs text-muted mt-1 truncate">Vive en: {currentProperty.name}</p>
                    )}
                  </div>
                  <ChevronRightIcon className="w-5 h-5 text-muted shrink-0" />
                </Link>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block bg-surface rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-canvas text-muted text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Teléfono</th>
                  <th className="px-4 py-3 font-medium">Propiedad actual</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Perfil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/10">
                {tenants.map((tenant) => (
                  <tr
                    key={tenant.id}
                    onClick={() => (window.location.href = `/tenants/${tenant.id}/profile`)}
                    className="cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3 text-heading font-medium">{tenant.fullName}</td>
                    <td className="px-4 py-3 text-muted">{tenant.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-muted">{tenant.contracts?.[0]?.property.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[tenant.status]}`}>
                        {statusLabels[tenant.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/tenants/${tenant.id}/profile`} className="text-primary hover:underline">
                        Ver perfil →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </ProtectedRoute>
  );
}
