'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ToastProvider';
import { contractsApi, Contract, representativesApi, Representative } from '@/lib/api';
import { formatDate } from '@/lib/formatDate';
import { DetailHeader } from '@/components/StitchHeader';

const calculateSuggestedRent = (currentRent: number): number => {
  const increased = currentRent * 1.07;
  return Math.ceil(increased / 10) * 10;
};

export default function ContractRenewalPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const { token } = useAuth();
  const { showToast } = useToast();

  const [contract, setContract] = useState<Contract | null>(null);
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [durationMonths, setDurationMonths] = useState<number>(12);
  const [monthlyRent, setMonthlyRent] = useState<number>(0);
  const [suggestedRent, setSuggestedRent] = useState<number>(0);
  const [representativeId, setRepresentativeId] = useState<string>('');

  useEffect(() => {
    if (!token || !id) return;
    Promise.all([
      contractsApi.get(id, token),
      representativesApi.list(token)
    ])
      .then(([data, reps]) => {
        setContract(data);
        setRepresentatives(reps);
        const suggested = calculateSuggestedRent(Number(data.monthlyRent));
        setMonthlyRent(Number(data.monthlyRent));
        setSuggestedRent(suggested);
        if (reps.length > 0) {
          setRepresentativeId(reps[0].id);
        }
      })
      .catch((err) => {
        showToast(err instanceof Error ? err.message : 'Error al cargar los datos', 'error');
        router.push('/contracts');
      })
      .finally(() => setIsLoading(false));
  }, [token, id, router, showToast]);

  const handleAcceptSuggestion = () => {
    setMonthlyRent(suggestedRent);
  };

  const handleRenew = async () => {
    if (!contract || !token) return;
    if (durationMonths < 1 || durationMonths > 360) {
      showToast('La duración debe estar entre 1 y 360 meses', 'error');
      return;
    }
    if (monthlyRent <= 0) {
      showToast('La renta debe ser mayor a 0', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const newContract = await contractsApi.initiateRenewal(id, {
        monthlyRent,
        durationMonths,
        representativeId: representativeId || undefined,
      }, token);

      showToast('Contrato de renovación creado. Ahora debes generar y firmar el PDF.', 'success');
      router.push(`/contracts/${newContract.id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al renovar el contrato', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !contract) {
    return (
      <>
        <DetailHeader title="Renovar contrato" backHref={`/contracts/${id}`} />
        <p className="px-4 pt-4 text-xs text-[#73777f]">{isLoading ? 'Cargando...' : 'Contrato no encontrado.'}</p>
      </>
    );
  }

  const day = 24 * 60 * 60 * 1000;
  const prevEnd = new Date(contract.endDate || new Date());
  const newStart = new Date(prevEnd.getTime() + day);
  const newEndDate = new Date(newStart);
  newEndDate.setMonth(newEndDate.getMonth() + durationMonths);
  newEndDate.setDate(newEndDate.getDate() - 1);
  const rentIncrease = monthlyRent - Number(contract.monthlyRent);
  const rentIncreasePercent = ((rentIncrease / Number(contract.monthlyRent)) * 100).toFixed(1);
  const initials = (contract.tenant?.fullName ?? '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  const box = 'bg-white rounded-[8px] p-4 border border-[#DDD9CF] shadow-[0_1px_3px_rgba(23,58,95,0.04)]';

  // Markup portado de Stitch: design/stitch/contract-renew.html (pantalla de tarea, sin tab bar)
  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#fdf9f0]">
      <DetailHeader title="Renovar contrato" subtitle={`${contract.tenant?.fullName ?? ''} · ${contract.property?.name ?? ''}`} backHref={`/contracts/${id}`} />

      <main className="flex-1 w-full max-w-md sm:max-w-2xl mx-auto px-4 py-4 space-y-4">
        <section className={box}>
          <div className="flex items-center justify-between pb-3 border-b border-[#F5F1E8]">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#173A5F]/10 text-[#173A5F]">
                <span className="material-symbols-outlined text-[15px]">description</span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#A7B0BB]">Contrato Vigente</span>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#2D9E6B]/10 text-[#2D9E6B] border border-[#2D9E6B]/20">● Activo</span>
          </div>
          <div className="pt-3 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-[8px] bg-[#173A5F] text-white flex items-center justify-center font-bold text-sm shrink-0">{initials}</div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-[#173A5F] truncate">{contract.tenant?.fullName}</h2>
                <p className="text-xs text-[#A7B0BB] flex items-center gap-1 mt-0.5 truncate">
                  <span className="material-symbols-outlined text-[14px]">apartment</span>
                  {contract.property?.name}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-[#F5F1E8] rounded-[8px] p-2.5 border border-[#DDD9CF]/60">
                <span className="text-[11px] font-medium text-[#A7B0BB] block">Fecha de término</span>
                <div className="flex items-center gap-1 mt-0.5 text-[#173A5F] font-bold text-xs">
                  <span className="material-symbols-outlined text-[15px] text-[#A7B0BB]">event</span>
                  <span>{contract.endDate ? formatDate(contract.endDate) : '—'}</span>
                </div>
                <span className="text-[10px] font-semibold text-amber-600 block mt-0.5">{contract.durationMonths} meses pactados</span>
              </div>
              <div className="bg-[#F5F1E8] rounded-[8px] p-2.5 border border-[#DDD9CF]/60">
                <span className="text-[11px] font-medium text-[#A7B0BB] block">Renta mensual actual</span>
                <div className="flex items-center gap-1 mt-0.5 text-[#173A5F] font-bold text-xs">
                  <span className="material-symbols-outlined text-[15px] text-[#2D9E6B]">payments</span>
                  <span>
                    ${Number(contract.monthlyRent).toLocaleString('es-MX')} <span className="text-[10px] text-[#A7B0BB] font-normal">MXN</span>
                  </span>
                </div>
                <span className="text-[10px] text-[#A7B0BB] block mt-0.5">Depósito: ${Number(contract.depositAmount).toLocaleString('es-MX')} MXN</span>
              </div>
            </div>
          </div>
        </section>

        <section className={`${box} space-y-4`}>
          <div className="flex items-center gap-2 pb-2.5 border-b border-[#F5F1E8]">
            <span className="material-symbols-outlined text-[#2D9E6B]">history_edu</span>
            <h2 className="text-sm font-bold text-[#173A5F]">Condiciones del Nuevo Periodo</h2>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center gap-2">
              <label className="block text-xs font-bold text-[#173A5F]">Duración del contrato</label>
              <span className="text-[11px] font-semibold text-[#2D9E6B] bg-[#F5F1E8] px-2 py-0.5 rounded-[8px] border border-[#DDD9CF] whitespace-nowrap">
                {formatDate(newStart.toISOString())} – {formatDate(newEndDate.toISOString())}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2" role="radiogroup">
              {[6, 12, 24].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDurationMonths(m)}
                  className={
                    durationMonths === m
                      ? 'py-2.5 px-2 text-center bg-[#173A5F] text-white rounded-[8px] text-xs font-bold border border-[#173A5F]'
                      : 'py-2.5 px-2 text-center border border-[#A7B0BB]/50 bg-[#F5F1E8] rounded-[8px] text-xs font-semibold text-[#173A5F] hover:bg-[#DDD9CF]/40 transition-colors'
                  }
                >
                  {m} meses
                </button>
              ))}
              <input
                type="number"
                min={1}
                max={360}
                value={durationMonths}
                onChange={(e) => setDurationMonths(Number(e.target.value))}
                aria-label="Otra duración en meses"
                className="py-2.5 px-2 text-center border border-[#A7B0BB]/50 bg-white rounded-[8px] text-xs font-semibold text-[#173A5F] focus:outline-none focus:border-[#173A5F]"
              />
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex justify-between items-center">
              <label htmlFor="input-renta" className="block text-xs font-bold text-[#173A5F]">
                Nueva renta mensual (MXN)
              </label>
              <span className="text-[11px] text-[#A7B0BB] font-medium">Actual: ${Number(contract.monthlyRent).toLocaleString('es-MX')}</span>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#173A5F] font-bold text-sm">$</span>
              <input
                type="number"
                id="input-renta"
                min="0.01"
                step="100"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(Number(e.target.value))}
                className="w-full pl-7 pr-20 py-2.5 bg-white border border-[#A7B0BB]/60 rounded-[8px] text-sm font-bold text-[#173A5F] focus:outline-none focus:border-[#173A5F] focus:ring-1 focus:ring-[#173A5F] tracking-tight"
              />
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs font-semibold text-[#A7B0BB]">MXN / mes</span>
            </div>
            {rentIncrease !== 0 && (
              <p className={`text-[11px] font-semibold ${rentIncrease > 0 ? 'text-amber-600' : 'text-[#2D9E6B]'}`}>
                {rentIncrease > 0 ? '+' : ''}
                {rentIncreasePercent}% respecto a la renta actual
              </p>
            )}
            <div className="bg-[#F5F1E8] border border-[#DDD9CF] rounded-[8px] p-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2D9E6B] text-[18px]">trending_up</span>
                <div>
                  <span className="text-xs font-semibold text-[#173A5F] block leading-tight">
                    +7% sugerido: <span className="font-bold text-[#2D9E6B]">${suggestedRent.toLocaleString('es-MX')}</span>
                  </span>
                  <span className="text-[10px] text-[#A7B0BB]">Redondeado a la decena superior</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAcceptSuggestion}
                className="px-2.5 py-1.5 rounded-[8px] bg-[#2D9E6B] text-white text-xs font-semibold hover:bg-[#258257] active:scale-95 transition-all flex items-center gap-1 shrink-0"
              >
                <span className="material-symbols-outlined text-[14px]">done</span>
                <span>Usar sugerencia</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <label htmlFor="select-representante" className="flex items-center gap-1 text-xs font-bold text-[#173A5F]">
              <span>Representante que firma</span>
              <span className="text-rose-500 font-bold">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#173A5F]">
                <span className="material-symbols-outlined text-[18px]">badge</span>
              </div>
              <select
                id="select-representante"
                value={representativeId}
                onChange={(e) => setRepresentativeId(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 bg-white border border-[#A7B0BB]/60 rounded-[8px] text-xs font-medium text-[#173A5F] focus:outline-none focus:border-[#173A5F] focus:ring-1 focus:ring-[#173A5F] appearance-none"
              >
                <option value="">Selecciona al apoderado legal...</option>
                {representatives.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.fullName}
                    {rep.position ? ` — ${rep.position}` : ''}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#A7B0BB]">
                <span className="material-symbols-outlined text-[18px]">expand_more</span>
              </div>
            </div>
            <p className="text-[10px] text-[#A7B0BB]">Este firmante figurará como parte arrendadora en el contrato.</p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#F5F1E8]">
            <div>
              <label className="block text-[11px] font-semibold text-[#A7B0BB] mb-1">Fecha de inicio</label>
              <div className="bg-[#F5F1E8] px-3 py-2 rounded-[8px] text-xs font-bold text-[#173A5F] border border-[#DDD9CF]">{formatDate(newStart.toISOString())}</div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#A7B0BB] mb-1">Día de corte y cobro</label>
              <div className="bg-[#F5F1E8] px-3 py-2 rounded-[8px] text-xs font-bold text-[#173A5F] border border-[#DDD9CF]">
                Día {String(contract.paymentDay).padStart(2, '0')} de cada mes
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[8px] bg-[#DDD9CF]/40 border border-[#DDD9CF] p-3.5 flex items-start gap-2.5 text-[#173A5F]">
          <span className="material-symbols-outlined text-[#A7B0BB] text-[18px] shrink-0 mt-0.5">info</span>
          <p className="text-xs font-medium leading-relaxed text-[#173A5F]/85">
            La renovación crea un contrato nuevo en borrador; el depósito original sigue en garantía.
          </p>
        </section>
      </main>

      <footer className="sticky bottom-0 bg-white border-t border-[#DDD9CF] px-4 py-3.5 pb-[calc(env(safe-area-inset-bottom)+0.875rem)] z-30 shadow-[0_-2px_10px_rgba(23,58,95,0.06)]">
        <div className="max-w-md sm:max-w-2xl mx-auto">
          <button
            type="button"
            onClick={handleRenew}
            disabled={isSubmitting || !representativeId}
            className="w-full py-3.5 px-4 rounded-[8px] bg-[#2D9E6B] text-white text-sm font-bold hover:bg-[#258257] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Creando...' : 'Crear renovación'}</span>
            <span className="material-symbols-outlined text-[19px]">arrow_forward</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
