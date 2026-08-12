'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PropertyFormModal } from '@/components/PropertyFormModal';
import { useAuth } from '@/hooks/useAuth';
import { propertiesApi, Property } from '@/lib/api';
import { ChevronRightIcon } from '@/components/icons';

const statusLabels: Record<Property['status'], string> = {
  OCUPADA: 'Ocupada',
  LIBRE: 'Libre',
  MANTENIMIENTO: 'Mantenimiento',
};

const statusColors: Record<Property['status'], string> = {
  OCUPADA: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  LIBRE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  MANTENIMIENTO: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function PropertiesPage() {
  const { token } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');

  const loadProperties = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await propertiesApi.list(token);
      setProperties(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar propiedades');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-heading">Propiedades</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary-pressed text-white px-4 py-2.5 rounded-xl text-sm font-medium self-start sm:self-auto active:opacity-80"
        >
          + Nueva propiedad
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-800 dark:text-red-400 mb-4">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="text-muted">Cargando...</p>
      ) : properties.length === 0 ? (
        <div className="bg-surface rounded-2xl p-8 text-center text-muted">No hay propiedades registradas.</div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="sm:hidden space-y-3">
            {properties.map((property) => {
              const occupant = property.contracts?.[0]?.tenant;
              return (
                <Link
                  key={property.id}
                  href={`/properties/${property.id}`}
                  className="flex items-center justify-between bg-surface rounded-2xl shadow-sm p-4 active:opacity-70 transition-opacity"
                >
                  <div className="min-w-0">
                    <p className="text-heading font-semibold truncate">{property.name}</p>
                    <p className="text-muted text-sm truncate">{property.city}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[property.status]}`}>
                        {statusLabels[property.status]}
                      </span>
                      <span className="text-sm text-heading font-medium">
                        ${Number(property.rentalPrice).toLocaleString('es-MX')}
                      </span>
                    </div>
                    {occupant && <p className="text-xs text-muted mt-1 truncate">Inquilino: {occupant.fullName}</p>}
                  </div>
                  <ChevronRightIcon className="w-5 h-5 text-muted shrink-0 ml-2" />
                </Link>
              );
            })}
          </div>

          {/* Desktop: table — editar y eliminar viven en el perfil de la propiedad, no aquí
              (mismo patrón que Inquilinos), así ambas vías de entrada (lista y tarjeta móvil)
              terminan en un único lugar con las acciones. */}
          <div className="hidden sm:block bg-surface rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-canvas text-muted text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Ciudad</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Renta</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Inquilino</th>
                  <th className="px-4 py-3 font-medium text-right">Perfil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/10">
                {properties.map((property) => (
                  <tr
                    key={property.id}
                    onClick={() => (window.location.href = `/properties/${property.id}`)}
                    className="cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3 text-heading font-medium">{property.name}</td>
                    <td className="px-4 py-3 text-muted">{property.city}</td>
                    <td className="px-4 py-3 text-muted">{property.propertyType === 'HOUSE' ? 'Casa' : 'Local'}</td>
                    <td className="px-4 py-3 text-muted">${Number(property.rentalPrice).toLocaleString('es-MX')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[property.status]}`}>
                        {statusLabels[property.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">{property.contracts?.[0]?.tenant.fullName ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/properties/${property.id}`} className="text-primary hover:underline">
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

      <PropertyFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSaved={loadProperties} />
    </ProtectedRoute>
  );
}
