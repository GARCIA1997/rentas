'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Modal, fieldLabel, fieldInput, btnSecondary, btnConfirm, btnDanger } from '@/components/Modal';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';
import {
  contractsApi,
  rentPaymentsApi,
  RentPayment,
  representativesApi,
  contractTemplatesApi,
  Contract,
  Representative,
  ContractTemplateSummary,
} from '@/lib/api';
import { formatDate } from '@/lib/formatDate';
import { DetailHeader } from '@/components/StitchHeader';

const contractFolio = (c: Contract) => `CTR-${c.id.slice(-6).toUpperCase()}`;
const money = (v: string | number) => `$${Number(v).toLocaleString('es-MX')}`;
const monthShort = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { month: 'short', timeZone: 'UTC' }).replace('.', '');
const waLink = (phone: string) => `https://wa.me/52${phone.replace(/\D/g, '').slice(-10)}`;

// Elegible para renovar: ACTIVE y termina dentro de 2 meses (mismo criterio que el backend).
function isRenewable(contract: Contract) {
  if (contract.status !== 'ACTIVE' || !contract.endDate) return false;
  const now = new Date();
  const limit = new Date();
  limit.setMonth(limit.getMonth() + 2);
  const end = new Date(contract.endDate);
  return end > now && end <= limit;
}

const statusLabels: Record<Contract['status'], string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Activo',
  EXPIRED: 'Expirado',
  AUTO_RENEWAL_PENDING: 'Renovación pendiente',
  CANCELLED: 'Cancelado',
};

const statusColors: Record<Contract['status'], string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  EXPIRED: 'bg-red-100 text-red-800',
  AUTO_RENEWAL_PENDING: 'bg-amber-100 text-amber-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-[#A7B0BB]/30 last:border-0 text-sm">
      <span className="text-[#586270]">{label}</span>
      <span className="text-[#173A5F] font-medium text-right">{value}</span>
    </div>
  );
}

interface EditFormState {
  representativeId: string;
  templateId: string;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  depositAmount: string;
  waterIncluded: boolean;
  hasParking: boolean;
  autoRenewal: boolean;
  latePaymentPercentage: string;
  maxDamageCharge: string;
  depositReturnDescription: string;
}

function ContractEditModal({
  contract,
  isOpen,
  onClose,
  onSaved,
}: {
  contract: Contract;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [templates, setTemplates] = useState<ContractTemplateSummary[]>([]);
  const [form, setForm] = useState<EditFormState | null>(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !token) return;
    setError('');
    setForm({
      representativeId: contract.representativeId ?? '',
      templateId: contract.templateUsed ?? '',
      startDate: contract.startDate.slice(0, 10),
      endDate: contract.endDate?.slice(0, 10) ?? '',
      monthlyRent: contract.monthlyRent,
      depositAmount: contract.depositAmount,
      waterIncluded: contract.waterIncluded,
      hasParking: contract.hasParking,
      autoRenewal: contract.autoRenewal,
      latePaymentPercentage: contract.penaltyRules?.latePaymentPercentage?.toString() ?? '',
      maxDamageCharge: contract.penaltyRules?.maxDamageCharge?.toString() ?? '',
      depositReturnDescription: contract.depositReturnPolicy?.description ?? '',
    });
    Promise.all([representativesApi.list(token), contractTemplatesApi.list(token)]).then(([reps, tpls]) => {
      setRepresentatives(reps.filter((r) => r.isActive));
      setTemplates(tpls);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, token, contract.id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !form) return;
    setError('');
    setIsSaving(true);
    try {
      const payload = {
        representativeId: form.representativeId || undefined,
        templateId: form.templateId || undefined,
        startDate: form.startDate,
        endDate: form.endDate,
        monthlyRent: Number(form.monthlyRent),
        depositAmount: Number(form.depositAmount),
        waterIncluded: form.waterIncluded,
        hasParking: form.hasParking,
        autoRenewal: form.autoRenewal,
        penaltyRules: {
          latePaymentPercentage: form.latePaymentPercentage ? Number(form.latePaymentPercentage) : undefined,
          maxDamageCharge: form.maxDamageCharge ? Number(form.maxDamageCharge) : undefined,
        },
        depositReturnPolicy: { description: form.depositReturnDescription || undefined },
      };
      await contractsApi.update(contract.id, payload, token);
      showToast('Contrato actualizado.', 'success');
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar contrato">
      {form && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={fieldLabel}>Representante (firma)</label>
            <select
              value={form.representativeId}
              onChange={(e) => setForm({ ...form, representativeId: e.target.value })}
              className={fieldInput}
            >
              <option value="">Sin asignar</option>
              {representatives.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.fullName} {rep.position ? `— ${rep.position}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={fieldLabel}>Plantilla de contrato</label>
            <select
              value={form.templateId}
              onChange={(e) => setForm({ ...form, templateId: e.target.value })}
              className={fieldInput}
            >
              <option value="">Sin plantilla (no se podrá generar PDF)</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={fieldLabel}>Fecha inicio</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
                className={fieldInput}
              />
            </div>
            <div>
              <label className={fieldLabel}>Fecha fin</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                required
                className={fieldInput}
              />
            </div>
          </div>
          <p className="text-xs text-[#586270] -mt-2">
            Cambiar las fechas no regenera el calendario de pagos ya creado; ajusta los pagos manualmente si es necesario.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={fieldLabel}>Renta mensual</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.monthlyRent}
                onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })}
                required
                className={fieldInput}
              />
            </div>
            <div>
              <label className={fieldLabel}>Depósito en garantía</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.depositAmount}
                onChange={(e) => setForm({ ...form, depositAmount: e.target.value })}
                required
                className={fieldInput}
              />
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-[#173A5F]">
              <input
                type="checkbox"
                checked={form.waterIncluded}
                onChange={(e) => setForm({ ...form, waterIncluded: e.target.checked })}
                className="rounded"
              />
              Agua incluida
            </label>
            <label className="flex items-center gap-2 text-sm text-[#173A5F]">
              <input
                type="checkbox"
                checked={form.autoRenewal}
                onChange={(e) => setForm({ ...form, autoRenewal: e.target.checked })}
                className="rounded"
              />
              Renovación automática
            </label>
            {contract.property?.propertyType === 'HOUSE' && (
              <label className="flex items-center gap-2 text-sm text-[#173A5F]">
                <input
                  type="checkbox"
                  checked={form.hasParking}
                  onChange={(e) => setForm({ ...form, hasParking: e.target.checked })}
                  className="rounded"
                />
                Estacionamiento
              </label>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={fieldLabel}>Penalización por retraso (%)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.latePaymentPercentage}
                onChange={(e) => setForm({ ...form, latePaymentPercentage: e.target.value })}
                className={fieldInput}
              />
            </div>
            <div>
              <label className={fieldLabel}>Cargo máximo por daños</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.maxDamageCharge}
                onChange={(e) => setForm({ ...form, maxDamageCharge: e.target.value })}
                className={fieldInput}
              />
            </div>
          </div>

          <div>
            <label className={fieldLabel}>Política de devolución de depósito</label>
            <textarea
              value={form.depositReturnDescription}
              onChange={(e) => setForm({ ...form, depositReturnDescription: e.target.value })}
              rows={2}
              className={fieldInput}
            />
          </div>

          {error && <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">{error}</div>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-lg border border-[#A7B0BB] bg-white text-sm font-bold text-[#173A5F] hover:bg-[#F5F1E8] transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="py-2.5 px-4 rounded-lg bg-[#2D9E6B] hover:bg-[#25855a] text-white font-bold text-sm shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function ContractCancelModal({
  contract,
  isOpen,
  onClose,
  onCancelled,
}: {
  contract: Contract;
  isOpen: boolean;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError('');
    }
  }, [isOpen]);

  const hasPenalty = contract.penaltyRules?.latePaymentPercentage || contract.penaltyRules?.maxDamageCharge;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !reason.trim()) return;
    setError('');
    setIsSaving(true);
    try {
      await contractsApi.cancel(contract.id, reason.trim(), token);
      showToast('Contrato cancelado.', 'success');
      onCancelled();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cancelar el contrato');
    } finally {
      setIsSaving(false);
    }
  };

  // Markup portado de Stitch: design/stitch/modal-cancel-contract.html
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cancelar contrato"
      subtitle={`Folio: ${contractFolio(contract)} · ${contract.property?.name ?? ''}`}
    >
      <form onSubmit={handleSubmit}>
        <div className="bg-rose-50/70 border border-rose-200/80 rounded-lg p-3.5 mb-4">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[16px] text-red-600 shrink-0 mt-0.5">info</span>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              <span className="font-bold text-red-700">Se detendrá la facturación:</span> los pagos pendientes futuros se eliminarán. Los pagos ya registrados se
              conservan y la propiedad quedará libre.
            </p>
          </div>
        </div>

        <div className="bg-[#F5F1E8]/60 border border-[#A7B0BB]/30 rounded-lg p-3 mb-4 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] text-[#A7B0BB] font-bold uppercase tracking-wider block">Inquilino</span>
            <span className="font-bold text-[#173A5F]">{contract.tenant?.fullName ?? '—'}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-[#A7B0BB] font-bold uppercase tracking-wider block">Vigencia pactada</span>
            <span className="font-semibold text-slate-700">Hasta {contract.endDate ? formatDate(contract.endDate) : '—'}</span>
          </div>
        </div>

        <div className="bg-white border border-[#A7B0BB]/30 rounded-lg p-3 mb-4 text-xs">
          <p className="font-bold text-[#173A5F] mb-1">Penalizaciones establecidas</p>
          {hasPenalty ? (
            <ul className="space-y-0.5 text-slate-600">
              {contract.penaltyRules?.latePaymentPercentage ? <li>Penalización por atraso: {contract.penaltyRules.latePaymentPercentage}%</li> : null}
              {contract.penaltyRules?.maxDamageCharge ? (
                <li>Cargo máximo por daños: ${Number(contract.penaltyRules.maxDamageCharge).toLocaleString('es-MX')}</li>
              ) : null}
            </ul>
          ) : (
            <p className="text-slate-500">Este contrato no tiene penalizaciones definidas.</p>
          )}
          <p className="text-[10px] text-[#A7B0BB] mt-1.5">Aplícalas manualmente al liquidar el depósito; el sistema no las cobra.</p>
        </div>

        <div className="mb-5">
          <div className="flex justify-between items-center mb-1.5">
            <label htmlFor="motivo" className="text-xs font-bold text-[#173A5F] flex items-center gap-1">
              Motivo de la cancelación <span className="text-red-500">*</span>
            </label>
            <span className="text-[11px] font-semibold text-[#A7B0BB]">{reason.length} / 1000</span>
          </div>
          <textarea
            id="motivo"
            rows={4}
            maxLength={1000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe el motivo de rescisión o término anticipado (acuerdo mutuo, entrega del inmueble, incumplimiento, etc.)..."
            className="w-full text-xs text-slate-800 placeholder-[#A7B0BB] bg-white border border-[#A7B0BB]/40 rounded-lg p-3 focus:outline-none focus:border-[#173A5F] focus:ring-1 focus:ring-[#173A5F] transition-all resize-none shadow-sm"
          />
        </div>

        {error && <div className="mb-3 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">{error}</div>}

        <div className="flex items-center gap-3 pt-1">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Volver
          </button>
          <button type="submit" disabled={isSaving || !reason.trim()} className={btnDanger}>
            <span className="material-symbols-outlined text-[16px]">block</span>
            {isSaving ? 'Cancelando...' : 'Cancelar contrato'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Markup portado de Stitch: design/stitch/modal-signed.html ("¿Cómo se firmó?")
function SignedModal({
  contract,
  isOpen,
  onClose,
  onSigned,
}: {
  contract: Contract;
  isOpen: boolean;
  onClose: () => void;
  onSigned: () => void;
}) {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [digital, setDigital] = useState(true);
  const [includeDeposit, setIncludeDeposit] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async () => {
    if (!token) return;
    setIsSaving(true);
    try {
      await contractsApi.markSigned(contract.id, digital, token, includeDeposit);
      showToast('Contrato marcado como firmado.', 'success');
      onSigned();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al marcar como firmado', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const option = (selected: boolean, onPick: () => void, title: string, desc: string, icon: string, recommended?: boolean) => (
    <button
      type="button"
      onClick={onPick}
      className={
        selected
          ? 'w-full text-left relative flex items-start gap-3 p-3.5 rounded-lg border-2 border-[#2D9E6B] bg-[#2D9E6B]/5 shadow-sm transition-all'
          : 'w-full text-left group relative flex items-start gap-3 p-3.5 rounded-lg border border-[#A7B0BB]/40 bg-white hover:bg-[#F5F1E8]/40 transition-all'
      }
    >
      <div className="mt-0.5 flex-shrink-0">
        {selected ? (
          <div className="w-5 h-5 rounded-full border-2 border-[#2D9E6B] bg-[#2D9E6B] flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-white"></div>
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full border-2 border-[#A7B0BB] flex items-center justify-center"></div>
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm text-[#173A5F]">{title}</span>
            {recommended && <span className="inline-flex items-center px-1.5 rounded text-[10px] font-bold bg-[#2D9E6B]/20 text-[#2D9E6B]">Recomendado</span>}
          </div>
          <span className={`material-symbols-outlined text-[18px] ${selected ? 'text-[#2D9E6B]' : 'text-slate-400'}`}>{icon}</span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5 leading-snug">{desc}</p>
      </div>
    </button>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="¿Cómo se firmó?" eyebrow="Paso de confirmación">
      <p className="text-xs text-slate-500 leading-relaxed -mt-2 mb-4">
        Selecciona el método de formalización para actualizar el expediente y activar el ciclo de cobros.
      </p>
      <div className="space-y-2.5">
        {option(!digital, () => setDigital(false), 'Firma física en papel', 'El documento impreso fue firmado de puño y letra por ambas partes.', 'history_edu')}
        {option(digital, () => setDigital(true), 'Firma digital por teléfono', 'El inquilino firmó desde su teléfono.', 'draw', true)}
      </div>
      <button
        type="button"
        onClick={() => setIncludeDeposit((v) => !v)}
        className="w-full text-left mt-4 p-3 bg-[#F5F1E8] rounded-lg border border-[#A7B0BB]/30 flex items-start gap-3"
      >
        <div className="mt-0.5 flex-shrink-0">
          {includeDeposit ? (
            <div className="w-5 h-5 rounded bg-[#2D9E6B] flex items-center justify-center text-white shadow-sm">
              <span className="material-symbols-outlined text-[16px] font-bold">check</span>
            </div>
          ) : (
            <div className="w-5 h-5 rounded border-2 border-[#A7B0BB] bg-white"></div>
          )}
        </div>
        <div className="flex-1 text-xs">
          <span className="font-bold text-[#173A5F]">Generar pago de depósito (${Number(contract.depositAmount).toLocaleString('es-MX')})</span>
          <p className="text-[11px] text-slate-500 mt-0.5">Crea el cobro de la garantía en el módulo de pagos.</p>
        </div>
      </button>
      <div className="flex items-start gap-2 px-1 mt-4 text-slate-500">
        <span className="material-symbols-outlined text-[18px] text-[#A7B0BB] flex-shrink-0 mt-0.5">info</span>
        <p className="text-xs leading-relaxed text-slate-500">Al confirmar se generará el calendario completo de {contract.durationMonths} pagos.</p>
      </div>
      <div className="pt-4 grid grid-cols-2 gap-3">
        <button type="button" onClick={onClose} className={btnSecondary}>
          Cancelar
        </button>
        <button type="button" onClick={submit} disabled={isSaving} className={btnConfirm}>
          <span className="material-symbols-outlined text-[18px]">verified</span>
          {isSaving ? 'Guardando...' : 'Marcar como firmado'}
        </button>
      </div>
    </Modal>
  );
}

export default function ContractDetailPage() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useParams();
  const contractId = params?.id as string;
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSignedOpen, setIsSignedOpen] = useState(false);
  const [payments, setPayments] = useState<RentPayment[]>([]);

  const loadContract = async (options?: { silent?: boolean }) => {
    if (!token || !contractId) return;
    if (!options?.silent) setIsLoading(true);
    setError('');
    try {
      setContract(await contractsApi.get(contractId, token));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el contrato');
    } finally {
      if (!options?.silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!token || !contractId) return;
    rentPaymentsApi
      .list(token)
      .then((all) => setPayments(all.filter((p) => p.contractId === contractId)))
      .catch(() => setPayments([]));
  }, [token, contractId, contract?.signedAt]);

  useEffect(() => {
    loadContract();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, contractId]);

  const handleGeneratePdf = async () => {
    if (!token) return;
    setIsGeneratingPdf(true);
    try {
      await contractsApi.generatePdf(contractId, token);
      await loadContract({ silent: true });
      showToast('PDF generado.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al generar el PDF', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!token) return;
    try {
      await contractsApi.downloadPdf(contractId, token);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al descargar el PDF', 'error');
    }
  };

  const handleDelete = async () => {
    if (!token || !contract) return;
    const confirmed = await confirm({
      title: 'Eliminar contrato',
      message: '¿Eliminar este contrato? Esta acción no se puede deshacer. También se eliminarán sus pagos programados.',
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!confirmed) return;
    setIsDeleting(true);
    try {
      await contractsApi.remove(contract.id, token);
      showToast('Contrato eliminado.', 'success');
      router.push('/contracts');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al eliminar', 'error');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute requiredRole="ADMIN">
        <DetailHeader title="Contrato" subtitle="Detalle de Contrato" backHref="/contracts" />
        <p className="px-4 pt-4 text-xs text-[#73777f]">Cargando...</p>
      </ProtectedRoute>
    );
  }

  if (!contract) {
    return (
      <ProtectedRoute requiredRole="ADMIN">
        <DetailHeader title="Contrato" subtitle="Detalle de Contrato" backHref="/contracts" />
        <div className="px-4 pt-4 max-w-md mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3.5 text-xs text-red-700">{error || 'No se pudo cargar el contrato'}</div>
        </div>
      </ProtectedRoute>
    );
  }

  const canEdit = !contract.signedAt;
  const canCancel = contract.status === 'ACTIVE';
  const canDelete = contract.status !== 'ACTIVE';
  const canRenew = isRenewable(contract);

  const rentPayments = payments
    .filter((p) => p.paymentType !== 'DEPOSIT')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const paidCount = rentPayments.filter((p) => p.status === 'PAID').length;
  const totalDue = rentPayments.reduce((sum, p) => sum + Number(p.amountDue), 0);
  const totalPaid = rentPayments.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
  const progress = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;
  const nextPendingId = rentPayments.find((p) => p.status !== 'PAID')?.id;
  const depositOver = contract.legalWarnings?.some((w) => w.toLowerCase().includes('depósito'));

  const statusBadge: Record<Contract['status'], string> = {
    DRAFT: 'bg-[#A7B0BB]/20 text-[#586270]',
    ACTIVE: 'bg-[#2D9E6B]/15 text-[#2D9E6B]',
    EXPIRED: 'bg-red-100 text-red-700',
    AUTO_RENEWAL_PENDING: 'bg-[#FFFBEB] text-[#D9822B]',
    CANCELLED: 'bg-red-100 text-red-700',
  };
  const statusDot: Record<Contract['status'], string> = {
    DRAFT: 'bg-[#A7B0BB]',
    ACTIVE: 'bg-[#2D9E6B]',
    EXPIRED: 'bg-red-600',
    AUTO_RENEWAL_PENDING: 'bg-[#D9822B]',
    CANCELLED: 'bg-red-600',
  };

  const shareWhatsApp = () => {
    const phone = contract.tenant?.phone;
    const text = `Hola ${contract.tenant?.fullName ?? ''}, te comparto la información de tu contrato ${contractFolio(contract)} de ${contract.property?.name ?? ''}. Puedes descargarlo desde tu portal de KsaRed.`;
    const url = phone ? `${waLink(phone)}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const card = 'bg-[#ffffff] rounded-lg border border-[#c3c6cf]/40 p-4 shadow-[0_1px_3px_rgba(23,58,95,0.04)]';
  const cardHead = 'flex items-center justify-between pb-2 mb-3 border-b border-[#f1eee5]';
  const chip = 'inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-[#f1eee5] text-[#173A5F]';
  const iconBtn = 'p-1.5 rounded text-[#ffffff] hover:bg-[#002445] active:scale-95 transition-all disabled:opacity-50';

  // Markup portado de Stitch: design/stitch/contract-detail.html
  return (
    <ProtectedRoute requiredRole="ADMIN">
      <DetailHeader
        title={`Contrato ${contractFolio(contract)}`}
        subtitle="Detalle de Contrato"
        backHref="/contracts"
        actions={
          <>
            {canEdit && (
              <button aria-label="Editar" className={iconBtn} type="button" onClick={() => setIsEditOpen(true)}>
                <span className="material-symbols-outlined text-[22px]">edit</span>
              </button>
            )}
            {canDelete && (
              <button aria-label="Eliminar" className={iconBtn} type="button" onClick={handleDelete} disabled={isDeleting}>
                <span className="material-symbols-outlined text-[22px]">delete</span>
              </button>
            )}
          </>
        }
      />

      <div className="w-full max-w-md sm:max-w-2xl mx-auto flex flex-col pb-28 sm:pb-8">
        {/* Sub-header Status Stripe */}
        <section className="bg-[#f7f3ea] px-4 py-2.5 border-b border-[#c3c6cf]/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-label-md font-sans text-[#43474e]">Estado actual:</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge[contract.status]}`}>
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusDot[contract.status]}`}></span>
              {statusLabels[contract.status]}
            </span>
          </div>
          <div className="text-[11px] font-medium text-[#73777f]">Folio: #{contractFolio(contract)}</div>
        </section>

        <main className="px-4 pt-3.5 space-y-3.5 flex-1">
          {contract.status === 'CANCELLED' && (
            <article className="bg-red-50 border border-red-200 rounded-lg p-3.5 flex items-start gap-3">
              <span className="material-symbols-outlined text-red-600 text-[22px] flex-shrink-0 mt-0.5 fill">cancel</span>
              <div className="flex-1">
                <h2 className="text-label-lg font-sans text-red-800 font-bold">
                  Cancelado el {contract.cancelledAt ? formatDate(contract.cancelledAt) : '—'}
                </h2>
                {contract.cancellationReason && <p className="text-body-sm font-sans text-red-700 mt-0.5 leading-snug">{contract.cancellationReason}</p>}
              </div>
            </article>
          )}

          {!canEdit && contract.status !== 'CANCELLED' && (
            <article className="bg-[#f7f3ea] border border-[#c3c6cf]/40 rounded-lg p-3 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[#173A5F] text-[18px] flex-shrink-0 mt-0.5">lock</span>
              <p className="text-body-sm font-sans text-[#43474e] leading-snug">
                Este contrato ya está firmado y no puede editarse. Si necesitas cambiar sus condiciones, cancélalo y crea uno nuevo.
              </p>
            </article>
          )}

          {/* Aviso Legal Ámbar */}
          {contract.legalWarnings && contract.legalWarnings.length > 0 && (
            <article className="bg-[#FFFBEB] border border-[#FDE68A] rounded-lg p-3.5 shadow-[0_1px_2px_rgba(217,130,43,0.06)] flex items-start gap-3">
              <span className="material-symbols-outlined text-[#D9822B] text-[22px] flex-shrink-0 mt-0.5 fill">warning</span>
              <div className="flex-1">
                <h2 className="text-label-lg font-sans text-[#92400E] font-bold">
                  {contract.legalWarnings.length === 1 ? 'Observación Jurídica Detectada' : `${contract.legalWarnings.length} Observaciones Jurídicas`}
                </h2>
                {contract.legalWarnings.map((w) => (
                  <p key={w} className="text-body-sm font-sans text-[#92400E] mt-0.5 leading-snug">
                    {w}
                  </p>
                ))}
              </div>
            </article>
          )}

          {/* Partes del Contrato */}
          <article className={card}>
            <div className={cardHead}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#173A5F] text-[20px]">groups</span>
                <h2 className="text-label-lg font-sans text-[#173A5F]">Partes del Contrato</h2>
              </div>
              <span className="text-label-sm font-sans text-[#73777f]">2 Personas</span>
            </div>
            <div className="space-y-3.5">
              <div className="flex items-start justify-between bg-[#f7f3ea]/60 rounded p-2.5 border border-[#c3c6cf]/30">
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#173a5f] text-[#ffffff] flex items-center justify-center font-bold text-xs">KS</div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#73777f]">Arrendador / Apoderado</span>
                    <p className="text-body-md font-sans font-semibold text-[#1c1c16]">{contract.representative?.fullName ?? 'Sin representante asignado'}</p>
                    <p className="text-body-sm font-sans text-[#43474e] text-[11px]">KsaRed</p>
                  </div>
                </div>
              </div>
              <div className="flex items-start justify-between bg-[#f7f3ea]/60 rounded p-2.5 border border-[#c3c6cf]/30">
                <Link href={`/tenants/${contract.tenantId}/profile`} className="flex items-start gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#2D9E6B] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {(contract.tenant?.fullName ?? '?')
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join('')
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#2D9E6B]">Inquilino Titular</span>
                    <p className="text-body-md font-sans font-semibold text-[#1c1c16] truncate">{contract.tenant?.fullName ?? '—'}</p>
                    {contract.tenant?.phone && <p className="text-body-sm font-sans text-[#43474e] text-[11px]">{contract.tenant.phone}</p>}
                  </div>
                </Link>
                {contract.tenant?.phone && (
                  <div className="flex items-center gap-1">
                    <a aria-label="WhatsApp inquilino" className="p-1 text-[#2D9E6B] hover:bg-[#f1eee5] rounded" href={waLink(contract.tenant.phone)} target="_blank" rel="noopener noreferrer">
                      <span className="material-symbols-outlined text-[18px]">chat</span>
                    </a>
                    <a aria-label="Llamar a inquilino" className="p-1 text-[#173A5F] hover:bg-[#f1eee5] rounded" href={`tel:${contract.tenant.phone}`}>
                      <span className="material-symbols-outlined text-[18px]">call</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </article>

          {/* Inmueble Arrendado */}
          <Link href={`/properties/${contract.propertyId}`} className={`block ${card}`}>
            <div className={cardHead}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#173A5F] text-[20px]">apartment</span>
                <h2 className="text-label-lg font-sans text-[#173A5F]">Inmueble Arrendado</h2>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-[#2D9E6B]/15 text-[#2D9E6B]">
                {contract.property?.propertyType === 'LOCAL' ? 'Comercial' : 'Habitacional'}
              </span>
            </div>
            <div className="flex gap-3">
              <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-[#173A5F] border border-[#c3c6cf]/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-[32px] text-white/80">{contract.property?.propertyType === 'LOCAL' ? 'storefront' : 'home'}</span>
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-body-md font-sans font-bold text-[#1c1c16]">{contract.property?.name ?? '—'}</h3>
                  <p className="text-body-sm font-sans text-[#43474e] flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-[14px] text-[#73777f]">location_on</span>
                    {[contract.property?.address, contract.property?.city].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
            </div>
          </Link>

          {/* Términos del Arrendamiento */}
          <article className={card}>
            <div className={cardHead}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#173A5F] text-[20px]">contract</span>
                <h2 className="text-label-lg font-sans text-[#173A5F]">Términos del Arrendamiento</h2>
              </div>
              <span className="text-label-sm font-sans text-[#73777f]">{contract.durationMonths} meses</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3.5">
              <div className="p-2.5 rounded bg-[#f7f3ea] border border-[#c3c6cf]/30">
                <span className="text-[10px] font-medium text-[#73777f] block">Renta mensual</span>
                <span className="text-headline-sm font-sans font-bold text-[#173A5F]">{money(contract.monthlyRent)}</span>
                <span className="text-[10px] text-[#73777f] block">MXN / mes</span>
              </div>
              <div className="p-2.5 rounded bg-[#f7f3ea] border border-[#c3c6cf]/30">
                <span className="text-[10px] font-medium text-[#73777f] block">Depósito en garantía</span>
                <span className={`text-headline-sm font-sans font-bold ${depositOver ? 'text-[#D9822B]' : 'text-[#173A5F]'}`}>{money(contract.depositAmount)}</span>
                <span className={`text-[10px] block ${depositOver ? 'text-[#D9822B] font-medium' : 'text-[#73777f]'}`}>
                  {depositOver ? 'En revisión' : 'MXN'}
                </span>
              </div>
            </div>
            <dl className="space-y-2 text-body-sm font-sans">
              {[
                ['event_available', 'Fecha de inicio', formatDate(contract.startDate)],
                ['event_busy', 'Fecha de término', contract.endDate ? formatDate(contract.endDate) : '—'],
                ['today', 'Día de corte y pago', `Día ${String(contract.paymentDay).padStart(2, '0')} de cada mes`],
                ['badge', 'Plantilla', contract.templateUsed],
                ['history_edu', 'Firma', contract.signedAt ? `${formatDate(contract.signedAt)} · ${contract.signedDigitallyPhone ? 'Digital' : 'Física'}` : 'Pendiente'],
              ].map(([icon, label, value]) => (
                <div key={label} className="flex justify-between py-1 border-b border-[#f1eee5] gap-3">
                  <dt className="text-[#43474e] flex items-center gap-1.5 whitespace-nowrap">
                    <span className="material-symbols-outlined text-[15px] text-[#73777f]">{icon}</span>
                    {label}
                  </dt>
                  <dd className="font-semibold text-[#1c1c16] text-right truncate">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3.5 pt-3 border-t border-[#f1eee5]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#73777f] block mb-2">Servicios y Cláusulas Clave</span>
              <div className="flex flex-wrap gap-1.5">
                <span className={chip}>
                  <span className={`material-symbols-outlined text-[14px] ${contract.waterIncluded ? 'text-[#2D9E6B]' : 'text-[#A7B0BB]'}`}>
                    {contract.waterIncluded ? 'check_circle' : 'cancel'}
                  </span>
                  {contract.waterIncluded ? 'Agua incluida' : 'Agua no incluida'}
                </span>
                {contract.property?.propertyType === 'HOUSE' && (
                  <span className={chip}>
                    <span className={`material-symbols-outlined text-[14px] ${contract.hasParking ? 'text-[#2D9E6B]' : 'text-[#A7B0BB]'}`}>
                      {contract.hasParking ? 'check_circle' : 'cancel'}
                    </span>
                    {contract.hasParking ? 'Estacionamiento (1 cajón)' : 'Sin estacionamiento'}
                  </span>
                )}
                {contract.autoRenewal && (
                  <span className={chip}>
                    <span className="material-symbols-outlined text-[14px] text-[#2D9E6B]">autorenew</span>
                    Renovación automática activada
                  </span>
                )}
                {contract.penaltyRules?.latePaymentPercentage ? (
                  <span className={chip}>
                    <span className="material-symbols-outlined text-[14px] text-[#D9822B]">gavel</span>
                    Atraso: {contract.penaltyRules.latePaymentPercentage}%
                  </span>
                ) : null}
                {contract.penaltyRules?.maxDamageCharge ? (
                  <span className={chip}>
                    <span className="material-symbols-outlined text-[14px] text-[#D9822B]">gavel</span>
                    Daños máx. {money(contract.penaltyRules.maxDamageCharge)}
                  </span>
                ) : null}
              </div>
              {contract.depositReturnPolicy?.description && (
                <p className="text-[11px] text-[#43474e] mt-2.5 leading-snug">
                  <span className="font-bold text-[#173A5F]">Devolución del depósito: </span>
                  {contract.depositReturnPolicy.description}
                </p>
              )}
            </div>
          </article>

          {/* Calendario de Pagos */}
          {rentPayments.length > 0 && (
            <article className={card}>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#f1eee5]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#173A5F] text-[20px]">payments</span>
                  <h2 className="text-label-lg font-sans text-[#173A5F]">Calendario de Pagos</h2>
                </div>
                <span className="text-label-sm font-sans font-semibold text-[#2D9E6B]">
                  {paidCount} de {rentPayments.length} meses pagados
                </span>
              </div>
              <div className="my-3">
                <div className="flex justify-between text-[11px] font-medium text-[#73777f] mb-1.5">
                  <span>Progreso del ciclo</span>
                  <span className="font-bold text-[#173A5F]">
                    {progress.toFixed(1)}% ({money(totalPaid)} / {money(totalDue)} MXN)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                  <div className="h-full bg-[#2D9E6B] rounded-full" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 pt-1">
                {rentPayments.map((p) => {
                  const m = monthShort(p.dueDate);
                  const label = m.charAt(0).toUpperCase() + m.slice(1);
                  if (p.status === 'PAID')
                    return (
                      <div key={p.id} className="flex flex-col items-center justify-center p-2 rounded border border-[#2D9E6B]/30 bg-[#2D9E6B]/5">
                        <span className="text-[11px] font-bold text-[#173A5F]">{label}</span>
                        <span className="text-[9px] font-semibold text-[#2D9E6B] mt-0.5">Pagado</span>
                      </div>
                    );
                  if (p.status === 'OVERDUE')
                    return (
                      <div key={p.id} className="flex flex-col items-center justify-center p-2 rounded border border-red-300 bg-red-50">
                        <span className="text-[11px] font-bold text-red-800">{label}</span>
                        <span className="text-[9px] font-bold text-red-600 mt-0.5">Vencido</span>
                      </div>
                    );
                  if (p.id === nextPendingId)
                    return (
                      <div key={p.id} className="flex flex-col items-center justify-center p-2 rounded border border-[#D9822B] bg-[#FFFBEB] relative">
                        <span className="text-[11px] font-bold text-[#92400E]">{label}</span>
                        <span className="text-[9px] font-bold text-[#D9822B] mt-0.5">Próximo</span>
                      </div>
                    );
                  return (
                    <div key={p.id} className="flex flex-col items-center justify-center p-2 rounded border border-[#c3c6cf]/40 bg-[#f7f3ea]">
                      <span className="text-[11px] font-medium text-[#73777f]">{label}</span>
                      <span className="text-[9px] text-[#73777f] mt-0.5">Pendiente</span>
                    </div>
                  );
                })}
              </div>
            </article>
          )}

          {/* Acciones Administrativas */}
          <section className={`${card} space-y-2.5`}>
            <h2 className="text-label-md font-sans uppercase tracking-wider text-[#73777f] mb-2">Acciones Administrativas</h2>
            {!contract.signedAt && contract.status !== 'CANCELLED' && (
              <button
                onClick={() => setIsSignedOpen(true)}
                className="w-full h-11 rounded-lg bg-[#2D9E6B] hover:bg-[#25855A] active:scale-[0.98] transition-all text-white font-semibold text-body-md flex items-center justify-center gap-2"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">draw</span>
                Marcar como firmado
              </button>
            )}
            {contract.documentUrl ? (
              <button
                onClick={handleDownloadPdf}
                className="w-full h-11 rounded-lg bg-[#173A5F] hover:bg-[#122e4c] active:scale-[0.98] transition-all text-white font-semibold text-body-md flex items-center justify-center gap-2"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">download</span>
                Descargar PDF del Contrato
              </button>
            ) : null}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={handleGeneratePdf}
                disabled={isGeneratingPdf}
                className="h-10 rounded-lg border border-[#A7B0BB] bg-transparent hover:bg-[#f1eee5] active:scale-[0.98] transition-all text-[#173A5F] font-medium text-body-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                {isGeneratingPdf ? 'Generando...' : contract.documentUrl ? 'Regenerar PDF' : 'Generar PDF'}
              </button>
              <button
                onClick={shareWhatsApp}
                className="h-10 rounded-lg border border-[#A7B0BB] bg-transparent hover:bg-[#f1eee5] active:scale-[0.98] transition-all text-[#173A5F] font-medium text-body-sm flex items-center justify-center gap-1.5"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">chat</span>
                Enviar WhatsApp
              </button>
              {canRenew && (
                <button
                  onClick={() => router.push(`/contracts/${contract.id}/renew`)}
                  className="col-span-2 h-10 rounded-lg border border-[#A7B0BB] bg-transparent hover:bg-[#f1eee5] active:scale-[0.98] transition-all text-[#173A5F] font-medium text-body-sm flex items-center justify-center gap-1.5"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">cached</span>
                  Renovar Contrato
                </button>
              )}
            </div>
            {canCancel && (
              <button
                onClick={() => setIsCancelOpen(true)}
                className="w-full h-10 mt-1 rounded-lg border border-[#C0392B] bg-transparent hover:bg-red-50 active:scale-[0.98] transition-all text-[#C0392B] font-semibold text-body-sm flex items-center justify-center gap-2"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">cancel</span>
                Cancelar contrato
              </button>
            )}
          </section>

          <div className="text-center py-2 text-[11px] text-[#73777f]">Última modificación: {formatDate(contract.updatedAt)}</div>
        </main>
      </div>

      <ContractEditModal contract={contract} isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} onSaved={() => loadContract({ silent: true })} />
      <ContractCancelModal
        contract={contract}
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        onCancelled={() => loadContract({ silent: true })}
      />
      <SignedModal contract={contract} isOpen={isSignedOpen} onClose={() => setIsSignedOpen(false)} onSigned={() => loadContract({ silent: true })} />
    </ProtectedRoute>
  );
}
