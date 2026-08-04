'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { contractsApi, Contract } from '@/lib/api';
import { formatDate } from '@/lib/formatDate';
import { ChevronRightIcon } from '@/components/icons';

const statusLabels: Record<Contract['status'], string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Activo',
  EXPIRED: 'Expirado',
  AUTO_RENEWAL_PENDING: 'Renovación pendiente',
  CANCELLED: 'Cancelado',
};

const statusColors: Record<Contract['status'], string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  EXPIRED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  AUTO_RENEWAL_PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

type Segment = 'active' | 'finished' | 'cancelled';

const segmentStatuses: Record<Segment, Contract['status'][]> = {
  active: ['DRAFT', 'ACTIVE', 'AUTO_RENEWAL_PENDING'],
  finished: ['EXPIRED'],
  cancelled: ['CANCELLED'],
};

const segmentLabels: Record<Segment, string> = {
  active: 'Activos',
  finished: 'Finalizados',
  cancelled: 'Cancelados',
};

export default function ContractsPage() {
  const { token } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [segment, setSegment] = useState<Segment>('active');

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    contractsApi
      .list(token)
      .then(setContracts)
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar contratos'))
      .finally(() => setIsLoading(false));
  }, [token]);

  const counts: Record<Segment, number> = {
    active: contracts.filter((c) => segmentStatuses.active.includes(c.status)).length,
    finished: contracts.filter((c) => segmentStatuses.finished.includes(c.status)).length,
    cancelled: contracts.filter((c) => segmentStatuses.cancelled.includes(c.status)).length,
  };

  const filteredContracts = contracts.filter((c) => segmentStatuses[segment].includes(c.status));

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold text-heading">Contratos</h1>
        <Link
          href="/contracts/new"
          className="bg-primary hover:bg-primary-pressed text-white px-4 py-2.5 rounded-xl text-sm font-medium self-start sm:self-auto text-center active:opacity-80"
        >
          + Nuevo contrato
        </Link>
      </div>
      <Link href="/payments" className="inline-block text-sm text-primary hover:underline mb-6">
        Ver pagos →
      </Link>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-800 dark:text-red-400 mb-6">
          {error}
        </div>
      )}

      {/* Segmented control */}
      <div className="flex bg-canvas rounded-xl p-1 mb-6">
        {(Object.keys(segmentLabels) as Segment[]).map((key) => (
          <button
            key={key}
            onClick={() => setSegment(key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              segment === key ? 'bg-surface shadow-sm text-heading' : 'text-muted'
            }`}
          >
            {segmentLabels[key]} {counts[key] > 0 && `(${counts[key]})`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-muted">Cargando...</p>
      ) : contracts.length === 0 ? (
        <div className="bg-surface rounded-2xl p-8 text-center text-muted">No hay contratos registrados.</div>
      ) : filteredContracts.length === 0 ? (
        <div className="bg-surface rounded-2xl p-8 text-center text-muted">
          No hay contratos {segmentLabels[segment].toLowerCase()}.
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="sm:hidden space-y-3">
            {filteredContracts.map((contract) => (
              <Link
                key={contract.id}
                href={`/contracts/${contract.id}`}
                className="flex items-center gap-3 bg-surface rounded-2xl shadow-sm p-4 active:opacity-70 transition-opacity"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-heading font-semibold truncate">{contract.tenant?.fullName ?? '—'}</p>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[contract.status]}`}>
                      {statusLabels[contract.status]}
                    </span>
                  </div>
                  <p className="text-muted text-sm truncate">{contract.property?.name ?? '—'}</p>
                  <p className="text-xs text-muted mt-1">
                    {formatDate(contract.startDate)} — {contract.endDate ? formatDate(contract.endDate) : '—'} · $
                    {Number(contract.monthlyRent).toLocaleString('es-MX')}/mes
                    {!contract.signedAt && contract.status !== 'CANCELLED' && ' · Pendiente de firma'}
                  </p>
                </div>
                <ChevronRightIcon className="w-5 h-5 text-muted shrink-0" />
              </Link>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block bg-surface rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-canvas text-muted text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Inquilino</th>
                  <th className="px-4 py-3 font-medium">Propiedad</th>
                  <th className="px-4 py-3 font-medium">Vigencia</th>
                  <th className="px-4 py-3 font-medium">Renta</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Firmado</th>
                  <th className="px-4 py-3 font-medium text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/10">
                {filteredContracts.map((contract) => (
                  <tr
                    key={contract.id}
                    onClick={() => (window.location.href = `/contracts/${contract.id}`)}
                    className="cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3 text-heading font-medium">{contract.tenant?.fullName ?? '—'}</td>
                    <td className="px-4 py-3 text-muted">{contract.property?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">
                      {formatDate(contract.startDate)} — {contract.endDate ? formatDate(contract.endDate) : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted">${Number(contract.monthlyRent).toLocaleString('es-MX')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusColors[contract.status]}`}>
                        {statusLabels[contract.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">{contract.signedAt ? formatDate(contract.signedAt) : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/contracts/${contract.id}`} className="text-primary hover:underline">
                        Ver detalle →
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
