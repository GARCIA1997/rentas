'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Modal } from '@/components/Modal';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';
import {
  contractsApi,
  representativesApi,
  contractTemplatesApi,
  Contract,
  Representative,
  ContractTemplateSummary,
} from '@/lib/api';
import { formatDate } from '@/lib/formatDate';
import { ArrowLeftIcon, PencilIcon, TrashIcon, DownloadIcon, DocumentIcon, CheckCircleIcon, XCircleIcon } from '@/components/icons';

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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-black/5 dark:border-white/10 last:border-0 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-heading font-medium text-right">{value}</span>
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
            <label className="block text-sm font-medium text-heading mb-1">Representante (firma)</label>
            <select
              value={form.representativeId}
              onChange={(e) => setForm({ ...form, representativeId: e.target.value })}
              className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
            <label className="block text-sm font-medium text-heading mb-1">Plantilla de contrato</label>
            <select
              value={form.templateId}
              onChange={(e) => setForm({ ...form, templateId: e.target.value })}
              className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
              <label className="block text-sm font-medium text-heading mb-1">Fecha inicio</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
                className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-heading mb-1">Fecha fin</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                required
                className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <p className="text-xs text-muted -mt-2">
            Cambiar las fechas no regenera el calendario de pagos ya creado; ajusta los pagos manualmente si es necesario.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-heading mb-1">Renta mensual</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.monthlyRent}
                onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })}
                required
                className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-heading mb-1">Depósito en garantía</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.depositAmount}
                onChange={(e) => setForm({ ...form, depositAmount: e.target.value })}
                required
                className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-heading">
              <input
                type="checkbox"
                checked={form.waterIncluded}
                onChange={(e) => setForm({ ...form, waterIncluded: e.target.checked })}
                className="rounded"
              />
              Agua incluida
            </label>
            <label className="flex items-center gap-2 text-sm text-heading">
              <input
                type="checkbox"
                checked={form.autoRenewal}
                onChange={(e) => setForm({ ...form, autoRenewal: e.target.checked })}
                className="rounded"
              />
              Renovación automática
            </label>
            {contract.property?.propertyType === 'HOUSE' && (
              <label className="flex items-center gap-2 text-sm text-heading">
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
              <label className="block text-sm font-medium text-heading mb-1">Penalización por retraso (%)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.latePaymentPercentage}
                onChange={(e) => setForm({ ...form, latePaymentPercentage: e.target.value })}
                className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-heading mb-1">Cargo máximo por daños</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.maxDamageCharge}
                onChange={(e) => setForm({ ...form, maxDamageCharge: e.target.value })}
                className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-heading mb-1">Política de devolución de depósito</label>
            <textarea
              value={form.depositReturnDescription}
              onChange={(e) => setForm({ ...form, depositReturnDescription: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {error && <div className="p-3 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm">{error}</div>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-muted hover:bg-canvas"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-primary hover:bg-primary-pressed text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
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
    if (!token) return;
    if (!reason.trim()) {
      setError('El motivo de cancelación es obligatorio');
      return;
    }
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cancelar contrato">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-400">
          Esto termina el contrato antes de su vencimiento. Los pagos pendientes o vencidos que aún no se cobraron se
          eliminarán del calendario; los pagos ya cobrados quedan como historial. La propiedad se marcará como libre.
        </div>

        <div className="bg-canvas rounded-xl p-4 text-sm">
          <p className="text-heading font-medium mb-1.5">Penalizaciones establecidas en el contrato</p>
          {hasPenalty ? (
            <ul className="space-y-1 text-muted">
              {contract.penaltyRules?.latePaymentPercentage ? (
                <li>Penalización por atraso: {contract.penaltyRules.latePaymentPercentage}%</li>
              ) : null}
              {contract.penaltyRules?.maxDamageCharge ? (
                <li>Cargo máximo por daños: ${Number(contract.penaltyRules.maxDamageCharge).toLocaleString('es-MX')}</li>
              ) : null}
            </ul>
          ) : (
            <p className="text-muted">Este contrato no tiene penalizaciones definidas.</p>
          )}
          <p className="text-xs text-muted mt-2">
            Aplica estas condiciones manualmente al liquidar el depósito o cualquier cargo con el inquilino; el sistema
            no las cobra automáticamente.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-heading mb-1">Motivo de cancelación</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            required
            placeholder="Ej. El inquilino solicitó terminar el contrato de forma anticipada por cambio de ciudad."
            className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        {error && <div className="p-3 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm">{error}</div>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-muted hover:bg-canvas"
          >
            Volver
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {isSaving ? 'Cancelando...' : 'Cancelar contrato'}
          </button>
        </div>
      </form>
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

  const handleMarkSigned = async () => {
    if (!token) return;
    const signedOnPhone = await confirm({
      title: '¿Cómo se firmó?',
      message: 'Indica si el contrato se firmó digitalmente desde el teléfono del inquilino o de forma física impresa.',
      confirmLabel: 'Por teléfono',
      cancelLabel: 'Firma física',
    });
    try {
      await contractsApi.markSigned(contractId, signedOnPhone, token);
      await loadContract({ silent: true });
      showToast('Contrato marcado como firmado.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al marcar como firmado', 'error');
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
        <p className="text-muted">Cargando...</p>
      </ProtectedRoute>
    );
  }

  if (!contract) {
    return (
      <ProtectedRoute requiredRole="ADMIN">
        <div className="space-y-4">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-muted hover:text-heading text-sm -ml-1">
            <ArrowLeftIcon className="w-4 h-4" />
            Atrás
          </button>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-400 text-sm">{error || 'No se pudo cargar el contrato'}</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const canEdit = !contract.signedAt;
  const canCancel = contract.status === 'ACTIVE';
  const canDelete = contract.status !== 'ACTIVE';

  // Contract is eligible for renewal if it's ACTIVE and ends within 2 months
  const canRenew = (() => {
    if (contract.status !== 'ACTIVE' || !contract.endDate) return false;
    const now = new Date();
    const twoMonthsFromNow = new Date();
    twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);
    const endDate = new Date(contract.endDate);
    return endDate > now && endDate <= twoMonthsFromNow;
  })();

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className="space-y-6 max-w-2xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-muted hover:text-heading text-sm -ml-1">
          <ArrowLeftIcon className="w-4 h-4" />
          Volver
        </button>

        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-heading">{contract.tenant?.fullName ?? '—'}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusColors[contract.status]}`}>
                {statusLabels[contract.status]}
              </span>
            </div>
            <p className="text-muted text-sm">{contract.property?.name ?? '—'}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canEdit && (
              <button
                onClick={() => setIsEditOpen(true)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-surface shadow-sm text-muted hover:text-primary transition-colors"
                aria-label="Editar"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-surface shadow-sm text-muted hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                aria-label="Eliminar"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {!canEdit && contract.status !== 'CANCELLED' && (
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-400">
            Este contrato ya está firmado y no puede editarse. Si necesitas cambiar sus condiciones, cancélalo y crea uno nuevo.
          </div>
        )}

        {contract.status === 'CANCELLED' && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm">
            <p className="text-red-800 dark:text-red-400 font-medium mb-1">
              Cancelado el {contract.cancelledAt ? formatDate(contract.cancelledAt) : '—'}
            </p>
            {contract.cancellationReason && <p className="text-red-700 dark:text-red-400">{contract.cancellationReason}</p>}
          </div>
        )}

        {contract.legalWarnings && contract.legalWarnings.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm">
            <p className="text-amber-800 dark:text-amber-300 font-medium mb-2">
              Revisión legal: {contract.legalWarnings.length === 1 ? '1 observación' : `${contract.legalWarnings.length} observaciones`}
            </p>
            <ul className="space-y-1.5">
              {contract.legalWarnings.map((warning) => (
                <li key={warning} className="text-amber-700 dark:text-amber-400 leading-snug">
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-surface rounded-2xl shadow-sm p-5">
          <h3 className="text-heading font-semibold mb-2">Datos del contrato</h3>
          <Row
            label="Inquilino"
            value={
              <Link href={`/tenants/${contract.tenantId}/profile`} className="text-primary hover:underline">
                {contract.tenant?.fullName ?? '—'}
              </Link>
            }
          />
          <Row
            label="Propiedad"
            value={
              <Link href={`/properties/${contract.propertyId}`} className="text-primary hover:underline">
                {contract.property?.name ?? '—'}
              </Link>
            }
          />
          <Row label="Representante" value={contract.representative?.fullName ?? 'Sin asignar'} />
          <Row label="Vigencia" value={`${formatDate(contract.startDate)} — ${contract.endDate ? formatDate(contract.endDate) : '—'}`} />
          <Row label="Duración" value={`${contract.durationMonths} meses`} />
          <Row label="Día de pago" value={`Día ${contract.paymentDay} de cada mes`} />
          <Row label="Renta mensual" value={`$${Number(contract.monthlyRent).toLocaleString('es-MX')}`} />
          <Row label="Depósito" value={`$${Number(contract.depositAmount).toLocaleString('es-MX')}`} />
          <Row label="Agua incluida" value={contract.waterIncluded ? 'Sí' : 'No'} />
          {contract.property?.propertyType === 'HOUSE' && (
            <Row label="Estacionamiento" value={contract.hasParking ? 'Sí, 1 cajón' : 'No'} />
          )}
          <Row label="Renovación automática" value={contract.autoRenewal ? 'Sí' : 'No'} />
        </div>

        {(contract.penaltyRules?.latePaymentPercentage || contract.penaltyRules?.maxDamageCharge || contract.depositReturnPolicy?.description) && (
          <div className="bg-surface rounded-2xl shadow-sm p-5">
            <h3 className="text-heading font-semibold mb-2">Condiciones y penalizaciones</h3>
            {contract.penaltyRules?.latePaymentPercentage ? (
              <Row label="Penalización por atraso" value={`${contract.penaltyRules.latePaymentPercentage}%`} />
            ) : null}
            {contract.penaltyRules?.maxDamageCharge ? (
              <Row label="Cargo máximo por daños" value={`$${Number(contract.penaltyRules.maxDamageCharge).toLocaleString('es-MX')}`} />
            ) : null}
            {contract.depositReturnPolicy?.description && (
              <div className="pt-2.5 text-sm">
                <p className="text-muted mb-1">Política de devolución de depósito</p>
                <p className="text-heading">{contract.depositReturnPolicy.description}</p>
              </div>
            )}
          </div>
        )}

        <div className="bg-surface rounded-2xl shadow-sm p-5">
          <h3 className="text-heading font-semibold mb-3">Firma y documento</h3>
          <Row label="Firmado" value={contract.signedAt ? formatDate(contract.signedAt) : 'Pendiente'} />
          {contract.signedAt && <Row label="Modalidad" value={contract.signedDigitallyPhone ? 'Digital (teléfono)' : 'Física impresa'} />}
          <div className="flex flex-wrap gap-2 mt-3">
            {!contract.signedAt && (
              <button
                onClick={handleMarkSigned}
                className="flex items-center gap-1.5 text-sm font-medium py-2 px-3 rounded-lg bg-primary text-white hover:bg-primary-pressed transition-colors"
              >
                <CheckCircleIcon className="w-4 h-4" />
                Marcar firmado
              </button>
            )}
            <button
              onClick={handleGeneratePdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 text-sm font-medium py-2 px-3 rounded-lg border border-black/10 dark:border-white/10 text-heading hover:bg-canvas transition-colors disabled:opacity-50"
            >
              <DocumentIcon className="w-4 h-4" />
              {isGeneratingPdf ? 'Generando...' : contract.documentUrl ? 'Regenerar PDF' : 'Generar PDF'}
            </button>
            {contract.documentUrl && (
              <button
                onClick={handleDownloadPdf}
                className="flex items-center gap-1.5 text-sm font-medium py-2 px-3 rounded-lg border border-black/10 dark:border-white/10 text-heading hover:bg-canvas transition-colors"
              >
                <DownloadIcon className="w-4 h-4" />
                Descargar PDF
              </button>
            )}
          </div>
        </div>

        {canRenew && (
          <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl shadow-sm p-5 border border-emerald-200 dark:border-emerald-800">
            <h3 className="text-heading font-semibold mb-1">Renovar contrato</h3>
            <p className="text-muted text-sm mb-3">
              Este contrato está próximo a vencer. Inicia el proceso de renovación para crear un nuevo período de ocupación con posibilidad de ajustar la renta.
            </p>
            <button
              onClick={() => router.push(`/contracts/${contract.id}/renew`)}
              className="flex items-center gap-1.5 text-sm font-medium py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors active:opacity-80"
            >
              Iniciar renovación →
            </button>
          </div>
        )}

        {canCancel && (
          <div className="bg-surface rounded-2xl shadow-sm p-5">
            <h3 className="text-heading font-semibold mb-1">Terminar contrato</h3>
            <p className="text-muted text-sm mb-3">
              Un contrato activo no se puede eliminar. Si el inquilino se va antes de tiempo, cancélalo — esto libera la
              propiedad y detiene los cobros futuros.
            </p>
            <button
              onClick={() => setIsCancelOpen(true)}
              className="flex items-center gap-1.5 text-sm font-medium py-2 px-3 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <XCircleIcon className="w-4 h-4" />
              Cancelar contrato
            </button>
          </div>
        )}
      </div>

      <ContractEditModal contract={contract} isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} onSaved={() => loadContract({ silent: true })} />
      <ContractCancelModal
        contract={contract}
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        onCancelled={() => loadContract({ silent: true })}
      />
    </ProtectedRoute>
  );
}
