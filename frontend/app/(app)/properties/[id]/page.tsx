'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { propertiesApi, PropertyDetail, Contract } from '@/lib/api';
import { formatDate } from '@/lib/formatDate';
import { ArrowLeftIcon } from '@/components/icons';

const statusLabels: Record<PropertyDetail['status'], string> = {
  OCUPADA: 'Ocupada',
  LIBRE: 'Libre',
  MANTENIMIENTO: 'Mantenimiento',
};

const statusColors: Record<PropertyDetail['status'], string> = {
  OCUPADA: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  LIBRE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  MANTENIMIENTO: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const contractStatusLabels: Record<Contract['status'], string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Activo',
  EXPIRED: 'Expirado',
  AUTO_RENEWAL_PENDING: 'Renovación pendiente',
  CANCELLED: 'Cancelado',
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-black/5 dark:border-white/10 last:border-0 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-heading font-medium text-right">{value}</span>
    </div>
  );
}

export default function PropertyDetailPage() {
  const { token } = useAuth();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !id) return;
    propertiesApi
      .getDetail(id, token)
      .then(setProperty)
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar la propiedad'))
      .finally(() => setIsLoading(false));
  }, [token, id]);

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <button
        onClick={() => router.push('/properties')}
        className="flex items-center gap-1.5 text-muted hover:text-heading text-sm mb-4 -ml-1"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Propiedades
      </button>

      {isLoading ? (
        <p className="text-muted">Cargando...</p>
      ) : error || !property ? (
        <p className="text-red-600 dark:text-red-400">{error || 'Propiedad no encontrada.'}</p>
      ) : (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-heading">{property.name}</h1>
              <p className="text-muted text-sm mt-0.5">
                {property.address}, {property.city}
              </p>
            </div>
            <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[property.status]}`}>
              {statusLabels[property.status]}
            </span>
          </div>

          <div className="bg-surface rounded-2xl shadow-sm p-5">
            <h3 className="text-heading font-semibold mb-2">Detalles</h3>
            <Row label="Tipo" value={property.propertyType === 'HOUSE' ? 'Casa' : 'Local'} />
            <Row label="Código postal" value={property.postalCode} />
            <Row label="Cuartos" value={property.bedrooms ?? '—'} />
            <Row label="Baños" value={property.bathrooms ?? '—'} />
            <Row label="Precio de lista" value={`$${Number(property.rentalPrice).toLocaleString('es-MX')}/mes`} />
            <Row label="Agua incluida" value={property.waterIncluded ? 'Sí' : 'No'} />
            {property.maintenanceNotes && <Row label="Notas de mantenimiento" value={property.maintenanceNotes} />}
          </div>

          <div className="bg-surface rounded-2xl shadow-sm p-5">
            <h3 className="text-heading font-semibold mb-2">Contrato activo</h3>
            {property.activeContract ? (
              <div>
                <Row label="Inquilino" value={property.activeContract.tenant.fullName} />
                <Row
                  label="Vigencia"
                  value={`${formatDate(property.activeContract.startDate)} — ${property.activeContract.endDate ? formatDate(property.activeContract.endDate) : "—"}`}
                />
                <Row label="Renta pactada" value={`$${Number(property.activeContract.monthlyRent).toLocaleString('es-MX')}`} />
                <div className="pt-3">
                  <Link href="/contracts" className="text-primary text-sm font-medium hover:underline">
                    Ver en Contratos →
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-muted text-sm">Esta propiedad no tiene un contrato activo.</p>
            )}
          </div>

          {property.contracts && property.contracts.length > 0 && (
            <div className="bg-surface rounded-2xl shadow-sm overflow-hidden">
              <h3 className="text-heading font-semibold p-5 pb-3">Historial de contratos</h3>
              <div className="divide-y divide-black/5 dark:divide-white/10">
                {property.contracts.map((contract) => (
                  <div key={contract.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <div>
                      <p className="text-heading font-medium">{contract.tenant?.fullName ?? '—'}</p>
                      <p className="text-muted text-xs">
                        {formatDate(contract.startDate)} — {contract.endDate ? formatDate(contract.endDate) : "—"}
                      </p>
                    </div>
                    <span className="text-muted text-xs">{contractStatusLabels[contract.status]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </ProtectedRoute>
  );
}
