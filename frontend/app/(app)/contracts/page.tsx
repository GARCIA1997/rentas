'use client';

// Markup portado de Stitch: design/stitch/contracts.html ("Listado de Contratos").
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { contractsApi, Contract, ContractRenewalAlert } from '@/lib/api';
import { formatDate } from '@/lib/formatDate';
import { MainHeader } from '@/components/StitchHeader';

type Filter = 'ALL' | 'ACTIVE' | 'RENEW' | 'DRAFT' | 'FINISHED' | 'CANCELLED';
const money = (n: number | string) => `$${Number(n).toLocaleString('es-MX')}`;
const initials = (name?: string) =>
  (name ?? '—')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
const contractFolio = (c: Pick<Contract, 'id'>) => `CTR-${c.id.slice(-6).toUpperCase()}`;

const badge: Record<Contract['status'], { label: string; cls: string }> = {
  DRAFT: { label: 'Borrador', cls: 'bg-[#FEF3C7] text-[#92400E]' },
  ACTIVE: { label: 'Activo', cls: 'bg-[#E8F5E9] text-[#2D9E6B]' },
  EXPIRED: { label: 'Finalizado', cls: 'bg-[#f1eee5] text-[#43474e]' },
  AUTO_RENEWAL_PENDING: { label: 'Por renovar', cls: 'bg-[#FEF3C7] text-[#92400E]' },
  CANCELLED: { label: 'Cancelado', cls: 'bg-[#FDECEA] text-[#C0392B]' },
};

export default function ContractsPage() {
  const { token } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [renewalAlerts, setRenewalAlerts] = useState<ContractRenewalAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    Promise.all([contractsApi.list(token), contractsApi.getRenewalAlerts(token)])
      .then(([c, a]) => {
        setContracts(c);
        setRenewalAlerts(a);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar contratos'))
      .finally(() => setIsLoading(false));
  }, [token]);

  const renewIds = new Set(renewalAlerts.map((a) => a.id));
  const daysById = new Map(renewalAlerts.map((a) => [a.id, a.daysUntilEnd]));
  const isRenew = (c: Contract) => renewIds.has(c.id) || c.status === 'AUTO_RENEWAL_PENDING';
  const matches: Record<Filter, (c: Contract) => boolean> = {
    ALL: () => true,
    ACTIVE: (c) => c.status === 'ACTIVE',
    RENEW: isRenew,
    DRAFT: (c) => c.status === 'DRAFT',
    FINISHED: (c) => c.status === 'EXPIRED',
    CANCELLED: (c) => c.status === 'CANCELLED',
  };
  const chips: { key: Filter; label: string }[] = [
    { key: 'ALL', label: 'Todos' },
    { key: 'ACTIVE', label: 'Activos' },
    { key: 'RENEW', label: 'Por renovar' },
    { key: 'DRAFT', label: 'Borrador' },
    { key: 'FINISHED', label: 'Finalizados' },
    { key: 'CANCELLED', label: 'Cancelados' },
  ];

  const q = query.trim().toLowerCase();
  const list = contracts
    .filter(matches[filter])
    .filter((c) => (q ? `${c.tenant?.fullName ?? ''} ${c.property?.name ?? ''} ${contractFolio(c)}`.toLowerCase().includes(q) : true));
  const activeCount = contracts.filter((c) => c.status === 'ACTIVE').length;

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <MainHeader>
        <div className="pt-1 sm:pt-0">
          <h1 className="font-sans text-headline-sm text-white font-semibold mt-3 sm:mt-0">Contratos de Arrendamiento</h1>
          <p className="font-sans text-body-sm text-[#A7B0BB] mt-0.5">
            {contracts.length} contratos registrados · {activeCount} activos
          </p>
          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-[#43474e]">search</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-white text-[#1c1c16] placeholder:text-[#A7B0BB] text-body-md font-sans pl-10 pr-3 py-2 rounded-lg border-0 focus:ring-2 focus:ring-[#2D9E6B] focus:outline-none shadow-sm"
                placeholder="Buscar por inquilino, propiedad, folio..."
                type="search"
              />
            </div>
          </div>
        </div>
      </MainHeader>

      <main className="px-4 py-4 space-y-4 flex-1 max-w-md sm:max-w-5xl mx-auto w-full">
        {error && <div className="bg-[#FDECEA] border border-[#F5C6C0] rounded-lg p-3 text-body-sm text-[#C0392B]">{error}</div>}

        {/* Alerta ámbar de contratos por vencer */}
        {renewalAlerts.length > 0 && (
          <div className="bg-[#FFF8E7] border border-[#F3DEB2] rounded-lg p-3 flex items-center justify-between gap-3 shadow-[0_1px_3px_rgba(23,58,95,0.04)]">
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[#D9822B] text-[22px] shrink-0 mt-0.5">schedule</span>
              <div>
                <h2 className="font-sans text-label-md text-[#945600] font-bold">
                  {renewalAlerts.length} contrato{renewalAlerts.length > 1 ? 's' : ''} por renovar
                </h2>
                <p className="font-sans text-body-sm text-[#B36B00]">Vencen en los próximos 2 meses</p>
              </div>
            </div>
            <button
              onClick={() => setFilter('RENEW')}
              className="px-2.5 py-1 text-label-sm font-sans bg-white border border-[#D9822B] text-[#D9822B] font-semibold rounded-lg shrink-0 hover:bg-[#FFF3D6] active:scale-95 transition"
            >
              Ver
            </button>
          </div>
        )}

        {/* Chips de filtro */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              className={
                filter === c.key
                  ? 'bg-[#173a5f] text-white px-3 py-1.5 rounded-lg font-sans text-label-md shrink-0 shadow-sm'
                  : 'bg-white text-[#002445] border border-[#A7B0BB]/40 px-3 py-1.5 rounded-lg font-sans text-label-md shrink-0 hover:border-[#173a5f] transition'
              }
            >
              {c.label} ({contracts.filter(matches[c.key]).length})
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-body-sm text-[#A7B0BB]">Cargando...</p>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-lg border border-[#A7B0BB]/30 p-6 text-center text-body-sm text-[#A7B0BB]">
            {contracts.length === 0 ? 'Aún no hay contratos registrados.' : 'Ningún contrato coincide con el filtro.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {list.map((c) => {
              const renew = isRenew(c);
              const b = renew && c.status === 'ACTIVE' ? badge.AUTO_RENEWAL_PENDING : badge[c.status];
              const days = daysById.get(c.id);
              return (
                <article key={c.id} className="bg-white rounded-lg border border-[#A7B0BB]/30 p-4 shadow-[0_1px_3px_rgba(23,58,95,0.05)]">
                  <div className="flex items-center justify-between pb-3 border-b border-[#A7B0BB]/20">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-[#43474e]">description</span>
                      <span className="font-sans text-label-md text-[#43474e] font-bold">{contractFolio(c)}</span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-sans font-semibold ${b.cls}`}>{b.label}</span>
                  </div>
                  <div className="mt-3 flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-full font-bold flex items-center justify-center shrink-0 font-sans text-label-md ${
                        c.status === 'ACTIVE' && !renew ? 'bg-[#2D9E6B]/15 text-[#2D9E6B]' : 'bg-[#173A5F]/10 text-[#002445]'
                      }`}
                    >
                      {initials(c.tenant?.fullName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-sans text-headline-sm text-[#1c1c16] font-semibold truncate">{c.tenant?.fullName ?? 'Pendiente'}</h3>
                      <p className="font-sans text-body-sm text-[#43474e] flex items-center gap-1 mt-0.5 truncate">
                        <span className="material-symbols-outlined text-[16px] text-[#A7B0BB]">apartment</span>
                        {c.property?.name ?? '—'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 bg-[#f7f3ea] rounded-lg p-2.5 space-y-1.5 border border-[#A7B0BB]/20">
                    <div className="flex justify-between items-center text-body-sm font-sans">
                      <span className="text-[#43474e]">Vigencia:</span>
                      <span className="text-[#1c1c16] font-medium">
                        {formatDate(c.startDate)} – {c.endDate ? formatDate(c.endDate) : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-body-sm font-sans">
                      {renew && days !== undefined ? (
                        <span className="text-[#D9822B] font-medium flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">warning</span> Vence en {days} días
                        </span>
                      ) : c.status === 'DRAFT' ? (
                        <span className="text-[#92400E] font-medium">Pendiente de firma</span>
                      ) : (
                        <span className="text-[#43474e]">{c.durationMonths} meses de contrato</span>
                      )}
                      <span className="text-[#002445] font-bold text-label-lg font-sans">
                        {money(c.monthlyRent)} MXN<span className="text-xs font-normal text-[#43474e]">/mes</span>
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link
                      href={`/contracts/${c.id}`}
                      className="w-full bg-[#173a5f] text-white py-2 rounded-lg font-sans text-label-md font-semibold hover:opacity-95 active:scale-95 transition-transform flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <span>Ver detalle</span>
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </Link>
                    {renew && c.status === 'ACTIVE' && (
                      <Link
                        href={`/contracts/${c.id}/renew`}
                        className="shrink-0 px-3 bg-white border border-[#D9822B] text-[#D9822B] py-2 rounded-lg font-sans text-label-md font-semibold hover:bg-[#FFF3D6] flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">autorenew</span>
                        Renovar
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* FAB */}
      <div className="fixed bottom-20 sm:bottom-6 right-4 z-40">
        <Link
          href="/contracts/new"
          className="bg-[#2D9E6B] text-white font-semibold text-xs px-4 py-3 rounded-lg shadow-lg hover:bg-[#258257] active:scale-95 transition-all duration-150 flex items-center space-x-1.5"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          <span>Nuevo contrato</span>
        </Link>
      </div>
    </ProtectedRoute>
  );
}
