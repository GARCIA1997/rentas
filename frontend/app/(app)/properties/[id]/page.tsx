'use client';

// Markup portado de Stitch: design/stitch/property-detail.html ("Detalle de Propiedad").
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PropertyFormModal } from '@/components/PropertyFormModal';
import { useAuth } from '@/hooks/useAuth';
import { propertiesApi, PropertyDetail, Contract, rentPaymentsApi, RentPayment } from '@/lib/api';
import { formatDate } from '@/lib/formatDate';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';
import { DetailHeader } from '@/components/StitchHeader';

type Tab = 'resumen' | 'contratos' | 'pagos';
const money = (n: number | string) => `$${Number(n).toLocaleString('es-MX')}`;
const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
const contractStatusLabels: Record<Contract['status'], string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Activo',
  EXPIRED: 'Expirado',
  AUTO_RENEWAL_PENDING: 'Por renovar',
  CANCELLED: 'Cancelado',
};
const contractBadge: Record<Contract['status'], string> = {
  DRAFT: 'bg-[#FFF4E5] text-[#D9822B]',
  ACTIVE: 'bg-[#E8F5E9] text-[#2D9E6B]',
  EXPIRED: 'bg-[#f1eee5] text-[#73777f]',
  AUTO_RENEWAL_PENDING: 'bg-[#FFF4E5] text-[#D9822B]',
  CANCELLED: 'bg-[#FFDAD6] text-[#C0392B]',
};
const daysUntil = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);

export default function PropertyDetailPage() {
  const { token } = useAuth();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tab, setTab] = useState<Tab>('resumen');

  const loadProperty = (options?: { silent?: boolean }) => {
    if (!token || !id) return;
    if (!options?.silent) setIsLoading(true);
    Promise.all([propertiesApi.getDetail(id, token), rentPaymentsApi.list(token)])
      .then(([prop, pays]) => {
        setProperty(prop);
        setPayments(pays.filter((p) => p.propertyId === id).sort((a, b) => +new Date(b.dueDate) - +new Date(a.dueDate)));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar la propiedad'))
      .finally(() => {
        if (!options?.silent) setIsLoading(false);
      });
  };

  useEffect(() => {
    loadProperty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  const handleDelete = async () => {
    if (!token || !property) return;
    const ok = await confirm({
      title: 'Eliminar propiedad',
      message: `¿Eliminar ${property.name}? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    setIsDeleting(true);
    try {
      await propertiesApi.remove(property.id, token);
      router.push('/properties');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al eliminar', 'error');
      setIsDeleting(false);
    }
  };

  const active = property?.activeContract ?? null;
  const overdue = payments.filter((p) => p.status === 'OVERDUE').length;

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <DetailHeader title="Detalle de Propiedad" subtitle={property ? property.city : undefined} backHref="/properties" />

      <main className="flex-1 pb-6 px-space-md pt-space-md space-y-space-md max-w-md sm:max-w-3xl mx-auto w-full">
        {isLoading ? (
          <p className="text-xs text-[#73777f]">Cargando...</p>
        ) : error || !property ? (
          <p className="text-xs text-[#C0392B]">{error || 'Propiedad no encontrada.'}</p>
        ) : (
          <>
            {/* Hero Card */}
            <section className="bg-[#ffffff] rounded-lg border border-[#c3c6cf]/40 overflow-hidden shadow-[0_1px_3px_rgba(23,58,95,0.05)]">
              <div className="relative w-full h-52 bg-[#173A5F] overflow-hidden">
                <div className="absolute -left-8 top-10 w-36 h-36 bg-[#0E253D] rotate-45"></div>
                <div className="absolute left-24 -top-12 w-36 h-36 bg-[#F5F1E8]/15 rotate-45"></div>
                <div className="absolute right-8 -bottom-16 w-40 h-40 bg-[#2D9E6B]/70 rotate-45"></div>
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  {property.status === 'OCUPADA' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-label-md font-sans bg-[#E8F5E9] text-[#2D9E6B] border border-[#2D9E6B]/30 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-[#2D9E6B]"></span>
                      Ocupada
                    </span>
                  ) : property.status === 'LIBRE' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-label-md font-sans bg-[#f1eee5] text-[#43474e] border border-[#c3c6cf]/40 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-[#A7B0BB]"></span>
                      Libre
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-label-md font-sans bg-[#FFF4E5] text-[#D9822B] border border-[#D9822B]/30 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-[#D9822B]"></span>
                      Mantenimiento
                    </span>
                  )}
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-label-sm font-sans bg-[#ffffff]/90 text-[#43474e] font-medium border border-[#c3c6cf]/40 shadow-sm">
                    {property.propertyType === 'HOUSE' ? 'Casa habitación' : 'Local comercial'}
                  </span>
                </div>
              </div>
              <div className="p-space-md space-y-space-sm">
                <div>
                  <h1 className="text-headline-md font-sans text-[#173a5f] tracking-tight">{property.name}</h1>
                  <p className="text-body-sm font-sans text-[#73777f] flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-[15px] text-[#73777f]">location_on</span>
                    {property.address}, C.P. {property.postalCode}
                  </p>
                </div>
                <div className="pt-1 pb-1 flex items-baseline justify-between border-b border-[#ece8df]">
                  <div>
                    <span className="text-headline-lg font-sans text-[#002445] tracking-tight">{money(active?.monthlyRent ?? property.rentalPrice)}</span>
                    <span className="text-body-md font-sans text-[#43474e] font-medium"> MXN / mes</span>
                  </div>
                  {active &&
                    (overdue > 0 ? (
                      <span className="text-label-sm font-sans text-[#C0392B] bg-[#FFDAD6] px-2 py-0.5 rounded-full font-semibold">
                        {overdue} vencido{overdue > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-label-sm font-sans text-[#2D9E6B] bg-[#E8F5E9] px-2 py-0.5 rounded-full font-semibold">Renta puntual</span>
                    ))}
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="bg-[#f7f3ea] p-2 rounded-lg border border-[#c3c6cf]/30 flex flex-col items-center">
                    <span className="material-symbols-outlined text-[20px] text-[#173a5f]">bed</span>
                    <span className="text-label-lg font-sans text-[#1c1c16] mt-0.5">{property.bedrooms ?? '—'}</span>
                    <span className="text-label-sm font-sans text-[#73777f]">Recám.</span>
                  </div>
                  <div className="bg-[#f7f3ea] p-2 rounded-lg border border-[#c3c6cf]/30 flex flex-col items-center">
                    <span className="material-symbols-outlined text-[20px] text-[#173a5f]">bathtub</span>
                    <span className="text-label-lg font-sans text-[#1c1c16] mt-0.5">{property.bathrooms ?? '—'}</span>
                    <span className="text-label-sm font-sans text-[#73777f]">Baños</span>
                  </div>
                  <div className="bg-[#f7f3ea] p-2 rounded-lg border border-[#c3c6cf]/30 flex flex-col items-center">
                    <span className="material-symbols-outlined text-[20px] text-[#173a5f]">water_drop</span>
                    <span className="text-label-lg font-sans text-[#1c1c16] mt-0.5">{property.waterIncluded ? 'Sí' : 'No'}</span>
                    <span className="text-label-sm font-sans text-[#73777f]">Agua incl.</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Section Tabs */}
            <nav aria-label="Secciones de propiedad" className="border-b border-[#c3c6cf]/30 flex justify-between bg-[#ffffff] rounded-lg px-2 shadow-[0_1px_2px_rgba(23,58,95,0.03)]">
              {(['resumen', 'contratos', 'pagos'] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={
                    tab === t
                      ? 'flex-1 py-3 text-center text-label-lg font-sans text-[#173a5f] border-b-[3px] border-[#2D9E6B] font-semibold transition-all'
                      : 'flex-1 py-3 text-center text-label-lg font-sans text-[#73777f] hover:text-[#1c1c16] font-medium transition-all'
                  }
                >
                  {t === 'resumen' ? 'Resumen' : t === 'contratos' ? 'Contratos' : 'Pagos'}
                </button>
              ))}
            </nav>

            {tab === 'resumen' && (
              <>
                {/* Card 1: Inquilino Actual */}
                <section className="bg-[#ffffff] p-space-md rounded-lg border border-[#c3c6cf]/40 shadow-[0_1px_3px_rgba(23,58,95,0.05)] space-y-space-sm">
                  <div className="flex items-center justify-between pb-1 border-b border-[#f1eee5]">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[20px] text-[#173a5f]">person</span>
                      <h2 className="text-headline-sm font-sans text-[#173a5f]">Inquilino actual</h2>
                    </div>
                    {active && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label-sm font-sans bg-[#E8F5E9] text-[#2D9E6B] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2D9E6B]"></span>
                        {overdue > 0 ? 'Con adeudo' : 'Al corriente'}
                      </span>
                    )}
                  </div>
                  {active ? (
                    <>
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-space-sm">
                          <div className="w-11 h-11 rounded-full bg-[#173a5f] text-[#ffffff] flex items-center justify-center font-sans text-body-lg font-bold border-2 border-[#8cf8bd]">
                            {initials(active.tenant.fullName)}
                          </div>
                          <div>
                            <p className="text-body-md font-sans font-semibold text-[#1c1c16]">{active.tenant.fullName}</p>
                            <p className="text-body-sm font-sans text-[#73777f]">{active.tenant.phone ?? 'Sin teléfono'}</p>
                          </div>
                        </div>
                        {active.tenant.phone && (
                          <div className="flex items-center gap-1.5">
                            <a
                              aria-label="Llamar inquilino"
                              className="w-9 h-9 rounded-lg border border-[#c3c6cf]/60 flex items-center justify-center text-[#173a5f] hover:bg-[#f7f3ea] active:scale-95 transition-all"
                              href={`tel:${active.tenant.phone}`}
                            >
                              <span className="material-symbols-outlined text-[20px]">call</span>
                            </a>
                            <a
                              aria-label="WhatsApp"
                              className="w-9 h-9 rounded-lg border border-[#2D9E6B]/30 bg-[#E8F5E9]/50 flex items-center justify-center text-[#2D9E6B] hover:bg-[#E8F5E9] active:scale-95 transition-all"
                              href={`https://wa.me/52${active.tenant.phone.replace(/\D/g, '').slice(-10)}`}
                              rel="noopener noreferrer"
                              target="_blank"
                            >
                              <span className="material-symbols-outlined text-[20px]">chat</span>
                            </a>
                          </div>
                        )}
                      </div>
                      <Link
                        href={`/tenants/${active.tenant.id}/profile`}
                        className="w-full mt-2 py-2.5 px-4 bg-[#173a5f] hover:bg-[#002445] text-[#ffffff] rounded-lg text-label-lg font-sans font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm"
                      >
                        <span>Ver perfil</span>
                        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                      </Link>
                    </>
                  ) : (
                    <div className="pt-1 flex items-center justify-between">
                      <p className="text-body-sm font-sans text-[#73777f]">Sin inquilino asignado.</p>
                      <Link href="/contracts/new" className="text-label-lg font-sans text-[#2D9E6B] font-semibold">
                        Asignar contrato
                      </Link>
                    </div>
                  )}
                </section>

                {/* Card 2: Contrato Vigente */}
                {active && (
                  <section className="bg-[#ffffff] p-space-md rounded-lg border border-[#c3c6cf]/40 shadow-[0_1px_3px_rgba(23,58,95,0.05)] space-y-space-sm">
                    <div className="flex items-center justify-between pb-1 border-b border-[#f1eee5]">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[20px] text-[#173a5f]">description</span>
                        <h2 className="text-headline-sm font-sans text-[#173a5f]">Contrato vigente</h2>
                      </div>
                      <span className="text-label-sm font-sans font-mono text-[#73777f] bg-[#f1eee5] px-2 py-0.5 rounded">
                        {active.durationMonths} meses
                      </span>
                    </div>
                    {active.endDate && (
                      <div
                        className={`border-l-4 p-2.5 rounded-r-lg flex items-center justify-between ${
                          daysUntil(active.endDate) <= 60 ? 'bg-[#FFF4E5] border-[#D9822B]' : 'bg-[#f7f3ea] border-[#2D9E6B]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`material-symbols-outlined text-[20px] ${daysUntil(active.endDate) <= 60 ? 'text-[#D9822B]' : 'text-[#2D9E6B]'}`}>
                            event_upcoming
                          </span>
                          <div className="text-body-sm font-sans">
                            <p className="font-semibold text-[#1c1c16]">
                              {formatDate(active.startDate)} – {formatDate(active.endDate)}
                            </p>
                            <p className={`text-[11px] font-medium ${daysUntil(active.endDate) <= 60 ? 'text-[#D9822B]' : 'text-[#2D9E6B]'}`}>Vigencia a término</p>
                          </div>
                        </div>
                        {daysUntil(active.endDate) <= 60 && (
                          <span className="text-label-sm font-sans px-2 py-0.5 rounded-full bg-[#D9822B] text-white font-semibold">
                            Vence en {daysUntil(active.endDate)} días
                          </span>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 pt-1 text-body-sm font-sans">
                      <div className="p-2 bg-[#f7f3ea] rounded border border-[#c3c6cf]/30">
                        <span className="text-label-sm font-sans text-[#73777f] block">Renta acordada</span>
                        <span className="text-body-md font-sans font-semibold text-[#1c1c16]">{money(active.monthlyRent)} MXN</span>
                      </div>
                      <div className="p-2 bg-[#f7f3ea] rounded border border-[#c3c6cf]/30">
                        <span className="text-label-sm font-sans text-[#73777f] block">Depósito garantía</span>
                        <span className="text-body-md font-sans font-semibold text-[#1c1c16]">{money(active.depositAmount)} MXN</span>
                      </div>
                    </div>
                    <div className="pt-1">
                      <Link
                        className="inline-flex items-center text-label-lg font-sans text-[#173a5f] hover:text-[#006c45] font-semibold transition-colors"
                        href={`/contracts/${active.id}`}
                      >
                        <span>Ver contrato</span>
                        <span className="material-symbols-outlined text-[16px] ml-1">arrow_forward</span>
                      </Link>
                    </div>
                  </section>
                )}

                {/* Card 3: Datos Técnicos */}
                <section className="bg-[#ffffff] p-space-md rounded-lg border border-[#c3c6cf]/40 shadow-[0_1px_3px_rgba(23,58,95,0.05)] space-y-space-sm">
                  <div className="flex items-center justify-between pb-1 border-b border-[#f1eee5]">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[20px] text-[#173a5f]">domain</span>
                      <h2 className="text-headline-sm font-sans text-[#173a5f]">Datos técnicos del inmueble</h2>
                    </div>
                    <span className="material-symbols-outlined text-[18px] text-[#73777f]">info</span>
                  </div>
                  <dl className="space-y-2 text-body-sm font-sans">
                    <div className="flex justify-between py-1 border-b border-[#ece8df]">
                      <dt className="text-[#73777f]">Tipo de propiedad</dt>
                      <dd className="font-medium text-[#1c1c16] text-right">{property.propertyType === 'HOUSE' ? 'Casa habitación' : 'Local comercial'}</dd>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#ece8df]">
                      <dt className="text-[#73777f]">Ciudad</dt>
                      <dd className="font-medium text-[#1c1c16] text-right">{property.city}</dd>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#ece8df]">
                      <dt className="text-[#73777f]">Código Postal</dt>
                      <dd className="font-medium text-[#1c1c16] text-right">C.P. {property.postalCode}</dd>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#ece8df]">
                      <dt className="text-[#73777f]">Precio de lista</dt>
                      <dd className="font-medium text-[#1c1c16] text-right">{money(property.rentalPrice)} / mes</dd>
                    </div>
                    <div className="flex justify-between pt-1">
                      <dt className="text-[#73777f]">Notas de mantenimiento</dt>
                      <dd className="font-medium text-[#1c1c16] text-right">{property.maintenanceNotes || '—'}</dd>
                    </div>
                  </dl>
                </section>
              </>
            )}

            {tab === 'contratos' && (
              <section className="bg-[#ffffff] rounded-lg border border-[#c3c6cf]/40 shadow-[0_1px_3px_rgba(23,58,95,0.05)] divide-y divide-[#f1eee5]">
                {property.contracts.length === 0 ? (
                  <p className="p-space-md text-body-sm font-sans text-[#73777f]">Sin contratos registrados.</p>
                ) : (
                  property.contracts.map((c) => (
                    <Link key={c.id} href={`/contracts/${c.id}`} className="flex items-center justify-between p-space-md">
                      <div className="min-w-0">
                        <p className="text-body-md font-sans font-semibold text-[#1c1c16] truncate">{c.tenant?.fullName ?? '—'}</p>
                        <p className="text-body-sm font-sans text-[#73777f]">
                          {formatDate(c.startDate)} – {c.endDate ? formatDate(c.endDate) : '—'}
                        </p>
                      </div>
                      <span className={`text-label-sm font-sans px-2 py-0.5 rounded-full font-semibold shrink-0 ${contractBadge[c.status]}`}>
                        {contractStatusLabels[c.status]}
                      </span>
                    </Link>
                  ))
                )}
              </section>
            )}

            {tab === 'pagos' && (
              <section className="bg-[#ffffff] rounded-lg border border-[#c3c6cf]/40 shadow-[0_1px_3px_rgba(23,58,95,0.05)] divide-y divide-[#f1eee5]">
                {payments.length === 0 ? (
                  <p className="p-space-md text-body-sm font-sans text-[#73777f]">Sin pagos registrados.</p>
                ) : (
                  payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-space-md">
                      <div className="min-w-0">
                        <p className="text-body-md font-sans font-semibold text-[#1c1c16] truncate">{p.tenant?.fullName ?? '—'}</p>
                        <p className="text-body-sm font-sans text-[#73777f]">Vence {formatDate(p.dueDate)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-body-md font-sans font-semibold text-[#1c1c16]">{money(p.amountDue)}</p>
                        <span
                          className={`text-label-sm font-sans px-2 py-0.5 rounded-full font-semibold ${
                            p.status === 'PAID'
                              ? 'bg-[#E8F5E9] text-[#2D9E6B]'
                              : p.status === 'OVERDUE'
                              ? 'bg-[#FFDAD6] text-[#C0392B]'
                              : 'bg-[#FFF4E5] text-[#D9822B]'
                          }`}
                        >
                          {p.status === 'PAID' ? 'Pagado' : p.status === 'OVERDUE' ? 'Vencido' : 'Próximo'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </section>
            )}

            {/* Bottom Action Buttons */}
            <div className="pt-2 pb-4 space-y-2">
              <button
                onClick={() => setIsEditOpen(true)}
                className="w-full py-2.5 px-4 rounded-lg border border-[#c3c6cf]/70 text-[#173a5f] bg-[#ffffff] hover:bg-[#f1eee5] text-label-lg font-sans font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
                <span>Editar detalles</span>
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full py-2 px-4 rounded-lg border border-[#C0392B]/40 text-[#C0392B] hover:bg-[#FFDAD6]/30 text-label-lg font-sans font-medium flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                <span>Eliminar propiedad</span>
              </button>
            </div>
          </>
        )}
      </main>

      <PropertyFormModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} property={property} onSaved={() => loadProperty({ silent: true })} />
    </ProtectedRoute>
  );
}
