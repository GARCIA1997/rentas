'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ToastProvider';
import { contractsApi, Contract, representativesApi, Representative } from '@/lib/api';
import { formatDate } from '@/lib/formatDate';

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

  if (isLoading) {
    return <p className="text-muted">Cargando...</p>;
  }

  if (!contract) {
    return <p className="text-muted">Contrato no encontrado.</p>;
  }

  const newEndDate = new Date(new Date(contract.endDate || new Date()).getTime() + durationMonths * 30 * 24 * 60 * 60 * 1000);
  const rentIncrease = monthlyRent - Number(contract.monthlyRent);
  const rentIncreasePercent = ((rentIncrease / Number(contract.monthlyRent)) * 100).toFixed(1);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-primary text-sm font-medium mb-2"
        >
          ← Volver
        </button>
        <h1 className="text-2xl font-bold text-heading">Renovar contrato</h1>
        <p className="text-muted text-sm mt-1">{contract.tenant?.fullName} • {contract.property?.name}</p>
      </div>

      {/* Original Contract Info */}
      <div className="bg-surface rounded-2xl shadow-sm p-5 mb-6">
        <h3 className="text-heading font-semibold mb-4">Contrato actual</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Vigencia</span>
            <span className="text-heading font-medium">
              {formatDate(contract.startDate)} — {contract.endDate ? formatDate(contract.endDate) : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Duración</span>
            <span className="text-heading font-medium">{contract.durationMonths} meses</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Renta mensual</span>
            <span className="text-heading font-medium">${Number(contract.monthlyRent).toLocaleString('es-MX')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Depósito (referencia)</span>
            <span className="text-heading font-medium">${Number(contract.depositAmount).toLocaleString('es-MX')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Día de pago</span>
            <span className="text-heading font-medium">Día {contract.paymentDay} de cada mes</span>
          </div>
        </div>
      </div>

      {/* Renewal Form */}
      <div className="bg-surface rounded-2xl shadow-sm p-5 space-y-6">
        <h3 className="text-heading font-semibold">Términos de la renovación</h3>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-heading mb-2">Duración (meses) *</label>
          <input
            type="number"
            min="1"
            max="360"
            value={durationMonths}
            onChange={(e) => setDurationMonths(Number(e.target.value))}
            className="w-full px-4 py-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-canvas text-heading focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <p className="text-xs text-muted mt-1">
            Fin de contrato: {formatDate(newEndDate.toISOString())}
          </p>
        </div>

        {/* Monthly Rent */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <label className="block text-sm font-medium text-heading">Renta mensual *</label>
            <button
              onClick={handleAcceptSuggestion}
              className="text-xs font-medium text-primary hover:underline"
            >
              Usar sugerencia de ${suggestedRent.toLocaleString('es-MX')}
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              min="0.01"
              step="100"
              value={monthlyRent}
              onChange={(e) => setMonthlyRent(Number(e.target.value))}
              className="flex-1 px-4 py-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-canvas text-heading focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <p className="text-xs text-muted mt-2">
            Aumento sugerido: 7% redondeado = ${suggestedRent.toLocaleString('es-MX')}
            {rentIncrease !== 0 && (
              <span className={rentIncrease > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
                {' '}({rentIncreasePercent}% de cambio)
              </span>
            )}
          </p>
        </div>

        {/* Representative */}
        <div>
          <label className="block text-sm font-medium text-heading mb-2">Representante *</label>
          <select
            value={representativeId}
            onChange={(e) => setRepresentativeId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-canvas text-heading focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Selecciona un representante</option>
            {representatives.map((rep) => (
              <option key={rep.id} value={rep.id}>
                {rep.fullName} ({rep.phone})
              </option>
            ))}
          </select>
          <p className="text-xs text-muted mt-1">El representante será quien firme el contrato renovado.</p>
        </div>

        {/* Summary Card */}
        <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
          <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 mb-3">Resumen de la renovación</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-emerald-800 dark:text-emerald-200">Nuevo inicio:</span>
              <span className="font-medium text-emerald-900 dark:text-emerald-100">
                {formatDate(new Date(new Date(contract.endDate || new Date()).getTime() + 1 * 24 * 60 * 60 * 1000).toISOString())}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-800 dark:text-emerald-200">Nuevo fin:</span>
              <span className="font-medium text-emerald-900 dark:text-emerald-100">
                {formatDate(newEndDate.toISOString())}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-800 dark:text-emerald-200">Renta mensual:</span>
              <span className="font-medium text-emerald-900 dark:text-emerald-100">
                ${monthlyRent.toLocaleString('es-MX')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-800 dark:text-emerald-200">Sin depósito</span>
              <span className="font-medium text-emerald-900 dark:text-emerald-100">
                (Referencia: ${Number(contract.depositAmount).toLocaleString('es-MX')})
              </span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => router.back()}
            className="flex-1 px-4 py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-heading font-medium hover:bg-surface transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleRenew}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-pressed text-white font-medium transition-colors disabled:opacity-50 active:opacity-80"
          >
            {isSubmitting ? 'Creando...' : 'Crear renovación'}
          </button>
        </div>
      </div>
    </div>
  );
}
