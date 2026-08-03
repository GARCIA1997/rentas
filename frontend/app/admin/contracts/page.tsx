'use client';

import { useEffect, useState, FormEvent } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminNavbar } from '@/components/AdminNavbar';
import { Modal } from '@/components/Modal';
import { useAuth } from '@/hooks/useAuth';
import {
  contractsApi,
  tenantsApi,
  representativesApi,
  contractTemplatesApi,
  propertiesApi,
  Contract,
  Tenant,
  Representative,
  ContractTemplateSummary,
  Property,
} from '@/lib/api';
import { formatDate } from '@/lib/formatDate';

interface ContractFormState {
  tenantId: string;
  representativeId: string;
  templateId: string;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  depositAmount: string;
  waterIncluded: boolean;
  autoRenewal: boolean;
  latePaymentPercentage: string;
  maxDamageCharge: string;
  depositReturnDescription: string;
}

const emptyForm: ContractFormState = {
  tenantId: '',
  representativeId: '',
  templateId: '',
  startDate: '',
  endDate: '',
  monthlyRent: '',
  depositAmount: '',
  waterIncluded: false,
  autoRenewal: false,
  latePaymentPercentage: '',
  maxDamageCharge: '',
  depositReturnDescription: '',
};

const statusLabels: Record<Contract['status'], string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Activo',
  EXPIRED: 'Expirado',
  AUTO_RENEWAL_PENDING: 'Renovación pendiente',
};

const statusColors: Record<Contract['status'], string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  EXPIRED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  AUTO_RENEWAL_PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
};

export default function ContractsPage() {
  const { token } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [templates, setTemplates] = useState<ContractTemplateSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContractFormState>(emptyForm);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [contractsData, tenantsData, propertiesData, representativesData, templatesData] = await Promise.all([
        contractsApi.list(token),
        tenantsApi.list(token),
        propertiesApi.list(token),
        representativesApi.list(token),
        contractTemplatesApi.list(token),
      ]);
      setContracts(contractsData);
      setTenants(tenantsData);
      setProperties(propertiesData);
      setRepresentatives(representativesData.filter((r) => r.isActive));
      setTemplates(templatesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar contratos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      templateId: templates.find((t) => t.isDefault)?.id ?? templates[0]?.id ?? '',
      representativeId: representatives[0]?.id ?? '',
    });
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (contract: Contract) => {
    setEditingId(contract.id);
    setForm({
      tenantId: contract.tenantId,
      representativeId: contract.representativeId ?? '',
      templateId: contract.templateUsed ?? '',
      startDate: contract.startDate.slice(0, 10),
      endDate: contract.endDate.slice(0, 10),
      monthlyRent: contract.monthlyRent,
      depositAmount: contract.depositAmount,
      waterIncluded: contract.waterIncluded,
      autoRenewal: contract.autoRenewal,
      latePaymentPercentage: contract.penaltyRules?.latePaymentPercentage?.toString() ?? '',
      maxDamageCharge: contract.penaltyRules?.maxDamageCharge?.toString() ?? '',
      depositReturnDescription: contract.depositReturnPolicy?.description ?? '',
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleTenantChange = (tenantId: string) => {
    const tenant = tenants.find((t) => t.id === tenantId);
    const property = tenant ? properties.find((p) => p.id === tenant.propertyId) : undefined;
    setForm((prev) => ({
      ...prev,
      tenantId,
      monthlyRent: property ? property.rentalPrice : prev.monthlyRent,
      waterIncluded: property ? property.waterIncluded : prev.waterIncluded,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError('');
    setIsSaving(true);

    try {
      const payload = {
        tenantId: form.tenantId,
        representativeId: form.representativeId || undefined,
        templateId: form.templateId || undefined,
        startDate: form.startDate,
        endDate: form.endDate,
        monthlyRent: Number(form.monthlyRent),
        depositAmount: Number(form.depositAmount),
        waterIncluded: form.waterIncluded,
        autoRenewal: form.autoRenewal,
        penaltyRules: {
          latePaymentPercentage: form.latePaymentPercentage ? Number(form.latePaymentPercentage) : undefined,
          maxDamageCharge: form.maxDamageCharge ? Number(form.maxDamageCharge) : undefined,
        },
        depositReturnPolicy: { description: form.depositReturnDescription || undefined },
      };

      if (editingId) {
        await contractsApi.update(editingId, payload, token);
      } else {
        await contractsApi.create(payload, token);
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    if (!confirm('¿Eliminar este contrato? Esta acción no se puede deshacer.')) return;
    try {
      await contractsApi.remove(id, token);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  const handleGeneratePdf = async (id: string) => {
    if (!token) return;
    setActionLoadingId(id);
    try {
      await contractsApi.generatePdf(id, token);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al generar el PDF');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDownloadPdf = async (id: string) => {
    if (!token) return;
    try {
      await contractsApi.downloadPdf(id, token);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al descargar el PDF');
    }
  };

  const handleMarkSigned = async (id: string) => {
    if (!token) return;
    const signedOnPhone = confirm('¿Se firmó digitalmente desde el teléfono? Aceptar = sí, Cancelar = firma física impresa.');
    try {
      await contractsApi.markSigned(id, signedOnPhone, token);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al marcar como firmado');
    }
  };

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className="min-h-screen bg-canvas">
        <AdminNavbar />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
            <h1 className="text-2xl font-bold text-heading">Contratos</h1>
            <button
              onClick={openCreateModal}
              disabled={tenants.length === 0}
              className="bg-primary hover:bg-primary-pressed text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 self-start sm:self-auto"
            >
              + Nuevo contrato
            </button>
          </div>

          {tenants.length === 0 && !isLoading && (
            <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 rounded-lg p-4 mb-6 text-sm">
              Registra primero un inquilino para poder generar un contrato.
            </div>
          )}

          {isLoading ? (
            <p className="text-muted">Cargando...</p>
          ) : contracts.length === 0 ? (
            <div className="bg-surface rounded-lg p-8 text-center text-muted">
              No hay contratos registrados.
            </div>
          ) : (
            <div className="bg-surface rounded-lg shadow overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-canvas text-muted text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Inquilino</th>
                    <th className="px-4 py-3 font-medium">Propiedad</th>
                    <th className="px-4 py-3 font-medium">Vigencia</th>
                    <th className="px-4 py-3 font-medium">Renta</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Firmado</th>
                    <th className="px-4 py-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/10">
                  {contracts.map((contract) => (
                    <tr key={contract.id}>
                      <td className="px-4 py-3 text-heading font-medium">{contract.tenant?.fullName ?? '—'}</td>
                      <td className="px-4 py-3 text-muted">{contract.property?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-muted whitespace-nowrap">
                        {formatDate(contract.startDate)} — {formatDate(contract.endDate)}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        ${Number(contract.monthlyRent).toLocaleString('es-MX')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusColors[contract.status]}`}
                        >
                          {statusLabels[contract.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {contract.signedAt ? formatDate(contract.signedAt) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-x-3 gap-y-1">
                          <button
                            onClick={() => handleGeneratePdf(contract.id)}
                            disabled={actionLoadingId === contract.id}
                            className="text-primary hover:underline disabled:opacity-50"
                          >
                            {actionLoadingId === contract.id ? 'Generando...' : 'Generar PDF'}
                          </button>
                          {contract.documentUrl && (
                            <button onClick={() => handleDownloadPdf(contract.id)} className="text-primary hover:underline">
                              Descargar
                            </button>
                          )}
                          {!contract.signedAt && (
                            <button onClick={() => handleMarkSigned(contract.id)} className="text-primary hover:underline">
                              Marcar firmado
                            </button>
                          )}
                          <button onClick={() => openEditModal(contract)} className="text-primary hover:underline">
                            Editar
                          </button>
                          <button onClick={() => handleDelete(contract.id)} className="text-red-600 hover:underline">
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingId ? 'Editar contrato' : 'Nuevo contrato'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-heading mb-1">Inquilino</label>
              <select
                value={form.tenantId}
                onChange={(e) => handleTenantChange(e.target.value)}
                required
                disabled={!!editingId}
                className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
              >
                <option value="" disabled>
                  Selecciona un inquilino
                </option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.fullName} — {tenant.property?.name}
                  </option>
                ))}
              </select>
            </div>

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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-heading mb-1">Penalización por retraso (%)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="Ej: 2"
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
              <label className="block text-sm font-medium text-heading mb-1">
                Política de devolución de depósito
              </label>
              <textarea
                value={form.depositReturnDescription}
                onChange={(e) => setForm({ ...form, depositReturnDescription: e.target.value })}
                rows={2}
                placeholder="Ej: 100% si la propiedad se entrega en buen estado, 50% si hay daños menores, 0% si hay daños mayores."
                className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {error && <div className="p-3 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm">{error}</div>}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
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
        </Modal>
      </div>
    </ProtectedRoute>
  );
}
