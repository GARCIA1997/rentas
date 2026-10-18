'use client';

// Markup portado de Stitch: design/stitch/tenants.html ("Directorio de Inquilinos").
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { tenantsApi, Tenant } from '@/lib/api';
import { MainHeader } from '@/components/StitchHeader';
import { Fab } from '@/components/Fab';

type Filter = 'ALL' | 'CONTRACT' | 'NO_PORTAL';
const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
const waLink = (phone: string) => `https://wa.me/52${phone.replace(/\D/g, '').slice(-10)}`;

export default function TenantsPage() {
  const { token } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    tenantsApi
      .list(token)
      .then(setTenants)
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar inquilinos'))
      .finally(() => setIsLoading(false));
  }, [token]);

  const withContract = tenants.filter((t) => (t.contracts?.length ?? 0) > 0);
  const noPortal = tenants.filter((t) => !t.userId);
  const chips: { key: Filter; label: string; count: number }[] = [
    { key: 'ALL', label: 'Todos', count: tenants.length },
    { key: 'CONTRACT', label: 'Con contrato', count: withContract.length },
    { key: 'NO_PORTAL', label: 'Sin cuenta portal', count: noPortal.length },
  ];

  const q = query.trim().toLowerCase();
  const list = (filter === 'ALL' ? tenants : filter === 'CONTRACT' ? withContract : noPortal).filter((t) =>
    q ? `${t.fullName} ${t.phone ?? ''} ${t.contracts?.[0]?.property?.name ?? ''}`.toLowerCase().includes(q) : true
  );

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <MainHeader>
        {/* SUB-CABECERA / TÍTULO DE SECCIÓN */}
        <div className="pt-4 pb-3 sm:pt-0">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-xl font-bold tracking-tight">Directorio de Inquilinos</h1>
            <span className="text-xs bg-[#2D9E6B]/20 text-[#2D9E6B] font-semibold px-2 py-0.5 rounded-full border border-[#2D9E6B]/40">
              {tenants.length} {tenants.length === 1 ? 'registrado' : 'registrados'}
            </span>
          </div>
          <p className="text-xs text-white/80">Gestión de accesos al portal, contratos y contactos</p>
        </div>
      </MainHeader>

      <div className="max-w-md sm:max-w-5xl mx-auto w-full">
        {/* BUSCADOR */}
        <div className="px-4 -mt-3 relative z-10">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#73777f] text-[20px]">search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="text"
              placeholder="Buscar por nombre, teléfono o propiedad..."
              className="w-full bg-white text-[#173A5F] placeholder-[#A7B0BB] text-xs font-medium pl-9 pr-3 py-2.5 rounded-[8px] border border-[#A7B0BB]/30 focus:outline-none focus:border-[#2D9E6B] shadow-sm"
            />
          </div>
        </div>

        {/* CHIPS DE FILTRO */}
        <div className="px-4 mt-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 text-xs">
            {chips.map((c) => (
              <button
                key={c.key}
                onClick={() => setFilter(c.key)}
                className={
                  filter === c.key
                    ? 'bg-[#173A5F] text-white font-semibold px-3.5 py-1.5 rounded-[8px] whitespace-nowrap shadow-sm'
                    : 'bg-white text-[#173A5F] hover:bg-white/80 font-medium px-3.5 py-1.5 rounded-[8px] border border-[#A7B0BB]/30 whitespace-nowrap shadow-sm'
                }
              >
                {c.label} ({c.count})
              </button>
            ))}
          </div>
        </div>

        {/* LISTA DE TARJETAS */}
        <main className="px-4 mt-3 pb-24 sm:pb-8">
          {error && <div className="mb-3 bg-red-50 border border-red-200 rounded-[8px] p-3 text-xs text-red-700">{error}</div>}
          {isLoading ? (
            <p className="text-xs text-[#73777f]">Cargando...</p>
          ) : list.length === 0 ? (
            <div className="bg-white rounded-[8px] border border-[#A7B0BB]/30 p-6 text-center text-xs text-[#73777f]">
              {tenants.length === 0 ? 'Aún no hay inquilinos registrados.' : 'Ningún inquilino coincide con la búsqueda.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {list.map((t) => {
                const contract = t.contracts?.[0];
                const isActive = t.status === 'ACTIVE';
                return (
                  <article
                    key={t.id}
                    className={`rounded-[8px] border border-[#A7B0BB]/30 p-3.5 shadow-sm hover:shadow transition-shadow ${isActive ? 'bg-white' : 'bg-[#F5F1E8]/60'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-11 h-11 rounded-full text-white flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                            isActive ? 'bg-[#173A5F] ring-2 ring-[#2D9E6B]/30' : 'bg-[#A7B0BB]'
                          }`}
                        >
                          {initials(t.fullName)}
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-sm font-bold text-[#173A5F] truncate">{t.fullName}</h2>
                          <p className="text-xs text-[#73777f] flex items-center gap-1 mt-0.5">
                            <span className="material-symbols-outlined text-[14px]">phone</span>
                            {t.phone ?? 'Sin teléfono'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 bg-[#2D9E6B]/15 text-[#2D9E6B] text-[11px] font-semibold px-2 py-0.5 rounded-[8px]">
                            <span className="w-1.5 h-1.5 bg-[#2D9E6B] rounded-full"></span>
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-[#A7B0BB]/20 text-[#586270] text-[11px] font-semibold px-2 py-0.5 rounded-[8px]">
                            <span className="w-1.5 h-1.5 bg-[#A7B0BB] rounded-full"></span>
                            {t.status === 'EVICTED' ? 'Desalojado' : 'Finalizado'}
                          </span>
                        )}
                        {t.userId ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-[#2D9E6B] font-medium bg-[#F5F1E8] px-1.5 py-0.5 rounded-[6px]" title="Cuenta activa en portal">
                            <span className="material-symbols-outlined text-[13px] fill text-[#2D9E6B]">key</span>
                            Portal On
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-[#D97706] font-medium bg-[#FEF3C7] px-1.5 py-0.5 rounded-[6px]" title="Sin cuenta en portal">
                            <span className="material-symbols-outlined text-[13px]">key_off</span>
                            Sin portal
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#A7B0BB]/20 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-[#173A5F] font-medium truncate mr-2">
                        <span className="material-symbols-outlined text-[16px] text-[#173A5F]">apartment</span>
                        <span className="truncate">{contract?.property?.name ?? 'Sin contrato activo'}</span>
                      </div>
                      {contract && (
                        <span className="text-[11px] font-semibold text-[#173A5F] bg-[#F5F1E8] px-2 py-0.5 rounded-[6px] whitespace-nowrap">
                          {contract.property.city}
                        </span>
                      )}
                    </div>

                    <div className="mt-2.5 flex items-center gap-2">
                      <Link
                        href={`/tenants/${t.id}/profile`}
                        className="flex-1 bg-[#173A5F] text-white text-xs font-semibold py-1.5 px-3 rounded-[8px] text-center hover:opacity-90 active:scale-95 transition-all"
                      >
                        Ver perfil
                      </Link>
                      {t.phone && (
                        <>
                          <a
                            href={`tel:${t.phone}`}
                            className="p-1.5 text-[#173A5F] hover:bg-[#F5F1E8] rounded-[8px] border border-[#A7B0BB]/30 flex items-center justify-center"
                            aria-label="Llamar"
                          >
                            <span className="material-symbols-outlined text-[18px]">call</span>
                          </a>
                          <a
                            href={waLink(t.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-[#2D9E6B] hover:bg-[#2D9E6B]/10 rounded-[8px] border border-[#A7B0BB]/30 flex items-center justify-center"
                            aria-label="WhatsApp"
                          >
                            <span className="material-symbols-outlined text-[18px]">chat</span>
                          </a>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>
      </div>
      <Fab icon="person_add" label="Nuevo inquilino" href="/tenants/new" />
    </ProtectedRoute>
  );
}
