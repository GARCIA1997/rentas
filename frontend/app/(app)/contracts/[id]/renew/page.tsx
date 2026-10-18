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
    return <p className="text-[#586270]">Cargando...</p>;
  }

  if (!contract) {
    return <p className="text-[#586270]">Contrato no encontrado.</p>;
  }

  const newEndDate = new Date(new Date(contract.endDate || new Date()).getTime() + durationMonths * 30 * 24 * 60 * 60 * 1000);
  const rentIncrease = monthlyRent - Number(contract.monthlyRent);
  const rentIncreasePercent = ((rentIncrease / Number(contract.monthlyRent)) * 100).toFixed(1);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-[#2D9E6B] text-sm font-medium mb-2"
        >
          ← Volver
        </button>
        <h1 className="text-2xl font-bold text-[#173A5F]">Renovar contrato</h1>
        <p className="text-[#586270] text-sm mt-1">{contract.tenant?.fullName} • {contract.property?.name}</p>
      </div>

      {/* Original Contract Info */}
      <div className="bg-white rounded-lg border border-[#A7B0BB]/30 shadow-sm p-5 mb-6">
        <h3 className="text-[#173A5F] font-semibold mb-4">Contrato actual</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-[#586270]">Vigencia</span>
            <span className="text-[#173A5F] font-medium">
              {formatDate(contract.startDate)} — {contract.endDate ? formatDate(contract.endDate) : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#586270]">Duración</span>
            <span className="text-[#173A5F] font-medium">{contract.durationMonths} meses</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#586270]">Renta mensual</span>
            <span className="text-[#173A5F] font-medium">${Number(contract.monthlyRent).toLocaleString('es-MX')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#586270]">Depósito (referencia)</span>
            <span className="text-[#173A5F] font-medium">${Number(contract.depositAmount).toLocaleString('es-MX')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#586270]">Día de pago</span>
            <span className="text-[#173A5F] font-medium">Día {contract.paymentDay} de cada mes</span>
          </div>
        </div>
      </div>

      {/* Renewal Form */}
      <div className="bg-white rounded-lg border border-[#A7B0BB]/30 shadow-sm p-5 space-y-6">
        <h3 className="text-[#173A5F] font-semibold">Términos de la renovación</h3>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-[#173A5F] mb-2">Duración (meses) *</label>
          <input
            type="number"
            min="1"
            max="360"
            value={durationMonths}
            onChange={(e) => setDurationMonths(Number(e.target.value))}
            className="w-full px-4 py-2.5 rounded-lg border border-[#A7B0BB]/30 bg-[#F5F1E8] text-[#173A5F] focus:outline-none focus:ring-2 focus:ring-[#173A5F]/50"
          />
          <p className="text-xs text-[#586270] mt-1">
            Fin de contrato: {formatDate(newEndDate.toISOString())}
          </p>
        </div>

        {/* Monthly Rent */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <label className="block text-sm font-medium text-[#173A5F]">Renta mensual *</label>
            <button
              onClick={handleAcceptSuggestion}
              className="text-xs font-medium text-[#2D9E6B] hover:underline"
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
              className="flex-1 px-4 py-2.5 rounded-lg border border-[#A7B0BB]/30 bg-[#F5F1E8] text-[#173A5F] focus:outline-none focus:ring-2 focus:ring-[#173A5F]/50"
            />
          </div>
          <p className="text-xs text-[#586270] mt-2">
            Aumento sugerido: 7% redondeado = ${suggestedRent.toLocaleString('es-MX')}
            {rentIncrease !== 0 && (
              <span className={rentIncrease > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                {' '}({rentIncreasePercent}% de cambio)
              </span>
            )}
          </p>
        </div>

        {/* Representative */}
        <div>
          <label className="block text-sm font-medium text-[#173A5F] mb-2">Representante *</label>
          <select
            value={representativeId}
            onChange={(e) => setRepresentativeId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-[#A7B0BB]/30 bg-[#F5F1E8] text-[#173A5F] focus:outline-none focus:ring-2 focus:ring-[#173A5F]/50"
          >
            <option value="">Selecciona un representante</option>
            {representatives.map((rep) => (
              <option key={rep.id} value={rep.id}>
                {rep.fullName} ({rep.phone})
              </option>
            ))}
          </select>
          <p className="text-xs text-[#586270] mt-1">El representante será quien firme el contrato renovado.</p>
        </div>

        {/* Summary Card */}
        <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
          <h4 className="text-sm font-semibold text-emerald-900 mb-3">Resumen de la renovación</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-emerald-800">Nuevo inicio:</span>
              <span className="font-medium text-emerald-900">
                {formatDate(new Date(new Date(contract.endDate || new Date()).getTime() + 1 * 24 * 60 * 60 * 1000).toISOString())}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-800">Nuevo fin:</span>
              <span className="font-medium text-emerald-900">
                {formatDate(newEndDate.toISOString())}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-800">Renta mensual:</span>
              <span className="font-medium text-emerald-900">
                ${monthlyRent.toLocaleString('es-MX')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-800">Sin depósito</span>
              <span className="font-medium text-emerald-900">
                (Referencia: ${Number(contract.depositAmount).toLocaleString('es-MX')})
              </span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => router.back()}
            className="flex-1 px-4 py-2.5 rounded-lg border border-[#A7B0BB]/30 text-[#173A5F] font-medium hover:bg-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleRenew}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 rounded-lg bg-[#2D9E6B] hover:bg-[#2D9E6B]-pressed text-white font-medium transition-colors disabled:opacity-50 active:opacity-80"
          >
            {isSubmitting ? 'Creando...' : 'Crear renovación'}
          </button>
        </div>
      </div>
    </div>
  );
}
