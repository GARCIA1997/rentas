'use client';

// Markup portado de Stitch: design/stitch/properties.html ("Listado de Propiedades").
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PropertyFormModal } from '@/components/PropertyFormModal';
import { useAuth } from '@/hooks/useAuth';
import { propertiesApi, Property } from '@/lib/api';
import { MainHeader } from '@/components/StitchHeader';

type Filter = 'ALL' | 'HOUSE' | 'LOCAL' | 'OCUPADA' | 'LIBRE';
const money = (n: number | string) => `$${Number(n).toLocaleString('es-MX')}`;
const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

/** El modelo no guarda fotos: en el hueco de la imagen va el patrón del isotipo (kit). */
function PropertyCover({ type }: { type: Property['propertyType'] }) {
  return (
    <div className="absolute inset-0 bg-[#173A5F] overflow-hidden">
      <div className="absolute -left-6 top-6 w-28 h-28 bg-[#0E253D] rotate-45"></div>
      <div className="absolute left-16 -top-10 w-28 h-28 bg-[#F5F1E8]/15 rotate-45"></div>
      <div className="absolute right-6 -bottom-12 w-32 h-32 bg-[#2D9E6B]/70 rotate-45"></div>
      <span className="absolute bottom-3 right-4 material-symbols-outlined text-white/30 text-[56px]">
        {type === 'HOUSE' ? 'home' : 'storefront'}
      </span>
    </div>
  );
}

export default function PropertiesPage() {
  const { token } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');

  const loadProperties = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      setProperties(await propertiesApi.list(token));
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

  const occupied = properties.filter((p) => p.status === 'OCUPADA').length;
  const free = properties.filter((p) => p.status === 'LIBRE').length;

  const chips: { key: Filter; label: string; count: number }[] = [
    { key: 'ALL', label: 'Todas', count: properties.length },
    { key: 'HOUSE', label: 'Casa habitación', count: properties.filter((p) => p.propertyType === 'HOUSE').length },
    { key: 'LOCAL', label: 'Local comercial', count: properties.filter((p) => p.propertyType === 'LOCAL').length },
    { key: 'OCUPADA', label: 'Ocupadas', count: occupied },
    { key: 'LIBRE', label: 'Libres', count: free },
  ];

  const q = query.trim().toLowerCase();
  const list = properties
    .filter((p) =>
      filter === 'ALL' ? true : filter === 'HOUSE' || filter === 'LOCAL' ? p.propertyType === filter : p.status === filter
    )
    .filter((p) =>
      q ? `${p.name} ${p.address} ${p.city} ${p.contracts?.[0]?.tenant.fullName ?? ''}`.toLowerCase().includes(q) : true
    );

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <MainHeader>
        {/* Page Title & Metrics Section */}
        <div className="pt-3 relative">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h1 className="font-sans text-2xl font-bold tracking-tight text-white">Propiedades</h1>
              <p className="font-sans text-xs font-medium text-[#A7B0BB] mt-0.5">{properties.length} inmuebles en gestión activa</p>
            </div>
            <div className="flex items-center space-x-1.5 bg-[#0E253D]/80 border border-[#A7B0BB]/25 px-2.5 py-1 rounded-lg shrink-0">
              <span className="w-2 h-2 rounded-full bg-[#2D9E6B]"></span>
              <span className="text-[11px] font-semibold text-white/90">{occupied} Ocupadas</span>
              <span className="text-[11px] text-[#A7B0BB] font-medium">· {free} Libres</span>
            </div>
          </div>
          {/* Search Bar */}
          <div className="mt-4 flex items-center space-x-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A7B0BB]">
                <span className="material-symbols-outlined text-[20px]">search</span>
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="block w-full pl-9 pr-3 py-2.5 text-xs font-medium bg-white text-[#173A5F] placeholder-[#A7B0BB] rounded-lg border-0 focus:ring-2 focus:ring-[#2D9E6B] shadow-sm transition outline-none"
                placeholder="Buscar propiedad, inquilino o dirección..."
                type="text"
              />
            </div>
          </div>
        </div>
      </MainHeader>

      {/* FILTER CHIPS BAR */}
      <section className="bg-white border-b border-[#A7B0BB]/20 px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="flex space-x-2 overflow-x-auto hide-scrollbar max-w-md sm:max-w-5xl mx-auto">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              className={
                filter === c.key
                  ? 'flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#173A5F] text-white transition-colors duration-150 shadow-sm'
                  : 'flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-white border border-[#A7B0BB]/40 text-[#173A5F] hover:bg-[#F5F1E8] transition-colors duration-150'
              }
            >
              {c.label} ({c.count})
            </button>
          ))}
        </div>
      </section>

      {/* MAIN LIST CONTENT */}
      <main className="flex-1 px-4 py-4 max-w-md sm:max-w-5xl mx-auto w-full">
        {error && <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">{error}</div>}
        {isLoading ? (
          <p className="text-xs text-[#A7B0BB]">Cargando...</p>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-lg border border-[#A7B0BB]/25 p-6 text-center text-xs text-[#A7B0BB]">
            {properties.length === 0 ? 'Aún no tienes propiedades.' : 'Ninguna propiedad coincide con el filtro.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((p) => {
              const occupant = p.contracts?.[0]?.tenant;
              const statusBadge =
                p.status === 'OCUPADA' ? (
                  <span className="inline-flex items-center space-x-1.5 bg-emerald-50 text-[#2D9E6B] font-semibold text-xs px-2.5 py-1 rounded-md border border-[#2D9E6B]/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2D9E6B] animate-pulse"></span>
                    <span>Ocupada</span>
                  </span>
                ) : p.status === 'LIBRE' ? (
                  <span className="inline-flex items-center space-x-1 bg-slate-100 text-[#173A5F] font-semibold text-xs px-2.5 py-1 rounded-md border border-[#A7B0BB]/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#A7B0BB]"></span>
                    <span>Libre</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 bg-amber-50 text-amber-700 font-semibold text-xs px-2.5 py-1 rounded-md border border-amber-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <span>Mantenimiento</span>
                  </span>
                );
              return (
                <article key={p.id} className="bg-white rounded-lg border border-[#A7B0BB]/25 shadow-sm overflow-hidden flex flex-col">
                  <div className="relative h-44 w-full overflow-hidden">
                    <PropertyCover type={p.propertyType} />
                    <div className="absolute top-3 left-3">{statusBadge}</div>
                    <div className="absolute top-3 right-3">
                      <span className="bg-[#173A5F]/90 text-white font-medium text-[11px] px-2.5 py-0.5 rounded-md">
                        {p.propertyType === 'HOUSE' ? 'Casa habitación' : 'Local comercial'}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h2 className="font-sans font-bold text-base text-[#173A5F]">{p.name}</h2>
                      <div className="flex items-center text-xs text-[#A7B0BB] mt-1">
                        <span className="material-symbols-outlined text-[16px] mr-1 text-[#2D9E6B]">location_on</span>
                        <span className="font-medium text-slate-600">
                          {p.address}, {p.city}
                        </span>
                      </div>
                      <div className="mt-3.5 pb-3 border-b border-[#A7B0BB]/15 flex items-baseline justify-between">
                        <span className="text-xs text-[#A7B0BB] font-medium">{p.status === 'OCUPADA' ? 'Canon mensual' : 'Canon estimado'}</span>
                        <div className="text-right">
                          <span className="font-sans font-bold text-lg text-[#173A5F]">{money(p.rentalPrice)}</span>
                          <span className="text-xs text-[#A7B0BB] font-medium"> MXN / mes</span>
                        </div>
                      </div>
                      {occupant ? (
                        <div className="mt-3 bg-[#F5F1E8]/60 p-2.5 rounded-lg border border-[#A7B0BB]/20 flex items-center justify-between">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#173A5F] text-white flex items-center justify-center font-bold text-xs">
                              {initials(occupant.fullName)}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-[#173A5F] leading-tight">{occupant.fullName}</p>
                              <p className="text-[10px] text-[#A7B0BB]">Inquilino actual</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 bg-amber-50/60 p-2.5 rounded-lg border border-amber-200 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="material-symbols-outlined text-[18px] text-amber-600">real_estate_agent</span>
                            <div>
                              <p className="text-xs font-semibold text-[#173A5F] leading-tight">Disponible</p>
                              <p className="text-[10px] text-[#A7B0BB]">Sin contrato activo</p>
                            </div>
                          </div>
                          <Link
                            href="/contracts/new"
                            className="bg-[#2D9E6B] text-white text-[11px] font-semibold px-2.5 py-1 rounded-md hover:opacity-90"
                          >
                            Asignar
                          </Link>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 pt-1">
                      <Link
                        href={`/properties/${p.id}`}
                        className="w-full bg-[#173A5F] text-white font-medium text-xs py-2 rounded-lg hover:opacity-95 transition flex items-center justify-center space-x-1.5"
                      >
                        <span>Ver ficha</span>
                        <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* FLOATING ACTION BUTTON (FAB) */}
      <div className="fixed bottom-20 sm:bottom-6 right-4 z-40">
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#2D9E6B] text-white font-semibold text-xs px-4 py-3 rounded-lg shadow-lg hover:bg-[#258257] active:scale-95 transition-all duration-150 flex items-center space-x-1.5 tracking-wide"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          <span>Nueva propiedad</span>
        </button>
      </div>

      <PropertyFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSaved={loadProperties} />
    </ProtectedRoute>
  );
}
