'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import {
  tenantsApi,
  propertiesApi,
  representativesApi,
  contractTemplatesApi,
  contractsApi,
  Tenant,
  TenantInput,
  Property,
  Representative,
  ContractTemplateSummary,
} from '@/lib/api';
import { ArrowLeftIcon, CheckCircleIcon } from '@/components/icons';
import { useToast } from '@/components/ToastProvider';

const STEP_LABELS = ['Inquilino', 'Propiedad y fechas', 'Renta y depósito', 'Firma y plantilla', 'Condiciones', 'Revisión'];

interface WizardState {
  tenantId: string;
  propertyId: string;
  startDate: string;
  durationMonths: string;
  paymentDay: string;
  monthlyRent: string;
  depositAmount: string;
  waterIncluded: boolean;
  hasParking: boolean;
  representativeId: string;
  templateId: string;
  autoRenewal: boolean;
  latePaymentPercentage: string;
  maxDamageCharge: string;
  depositReturnDescription: string;
}

const emptyState: WizardState = {
  tenantId: '',
  propertyId: '',
  startDate: '',
  durationMonths: '12',
  paymentDay: '1',
  monthlyRent: '',
  depositAmount: '',
  waterIncluded: false,
  hasParking: false,
  representativeId: '',
  templateId: '',
  autoRenewal: false,
  latePaymentPercentage: '',
  maxDamageCharge: '',
  depositReturnDescription: '',
};

const emptyTenantForm: TenantInput = { fullName: '', phone: '', email: '', idDocument: '', status: 'ACTIVE' };

const inputClass =
  'w-full px-3 py-2.5 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-xl focus:outline-none focus:ring-2 focus:ring-primary';
const labelClass = 'block text-sm font-medium text-heading mb-1.5';

export default function NewContractWizardPage() {
  const { token } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardState>(emptyState);

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [templates, setTemplates] = useState<ContractTemplateSummary[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [tenantSearch, setTenantSearch] = useState('');
  const [showNewTenantForm, setShowNewTenantForm] = useState(false);
  const [newTenant, setNewTenant] = useState<TenantInput>(emptyTenantForm);
  const [isCreatingTenant, setIsCreatingTenant] = useState(false);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdContractId, setCreatedContractId] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      tenantsApi.list(token),
      propertiesApi.list(token),
      representativesApi.list(token),
      contractTemplatesApi.list(token),
    ])
      .then(([tenantsData, propertiesData, representativesData, templatesData]) => {
        setTenants(tenantsData);
        setProperties(propertiesData);
        setRepresentatives(representativesData.filter((r) => r.isActive));
        setTemplates(templatesData);
      })
      .finally(() => setIsLoadingData(false));
  }, [token]);

  const selectedTenant = tenants.find((t) => t.id === form.tenantId);
  const selectedProperty = properties.find((p) => p.id === form.propertyId);
  const selectedRepresentative = representatives.find((r) => r.id === form.representativeId);
  const selectedTemplate = templates.find((t) => t.id === form.templateId);

  const filteredTenants = tenants.filter((t) =>
    t.fullName.toLowerCase().includes(tenantSearch.toLowerCase()) || (t.phone ?? '').includes(tenantSearch)
  );

  const canProceed = () => {
    switch (step) {
      case 0:
        return !!form.tenantId;
      case 1:
        return (
          !!form.propertyId &&
          !!form.startDate &&
          Number(form.durationMonths) > 0 &&
          Number(form.paymentDay) >= 1 &&
          Number(form.paymentDay) <= 31
        );
      case 2:
        return Number(form.monthlyRent) > 0 && Number(form.depositAmount) >= 0;
      default:
        return true;
    }
  };

  const handleSelectProperty = (propertyId: string) => {
    const property = properties.find((p) => p.id === propertyId);
    setForm((prev) => ({
      ...prev,
      propertyId,
      monthlyRent: property ? property.rentalPrice : prev.monthlyRent,
      waterIncluded: property ? property.waterIncluded : prev.waterIncluded,
    }));
  };

  const handleCreateTenant = async () => {
    if (!token || !newTenant.fullName) return;
    setIsCreatingTenant(true);
    setError('');
    try {
      const created = await tenantsApi.create(newTenant, token);
      setTenants((prev) => [created, ...prev]);
      setForm((prev) => ({ ...prev, tenantId: created.id }));
      setShowNewTenantForm(false);
      setNewTenant(emptyTenantForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear inquilino');
    } finally {
      setIsCreatingTenant(false);
    }
  };

  const handleSubmit = async () => {
    if (!token) return;
    setError('');
    setIsSubmitting(true);
    try {
      const contract = await contractsApi.create(
        {
          tenantId: form.tenantId,
          propertyId: form.propertyId,
          startDate: form.startDate,
          durationMonths: Number(form.durationMonths),
          paymentDay: Number(form.paymentDay),
          monthlyRent: Number(form.monthlyRent),
          depositAmount: Number(form.depositAmount),
          waterIncluded: form.waterIncluded,
          hasParking: form.hasParking,
          representativeId: form.representativeId || undefined,
          templateId: form.templateId || undefined,
          autoRenewal: form.autoRenewal,
          penaltyRules: {
            latePaymentPercentage: form.latePaymentPercentage ? Number(form.latePaymentPercentage) : undefined,
            maxDamageCharge: form.maxDamageCharge ? Number(form.maxDamageCharge) : undefined,
          },
          depositReturnPolicy: { description: form.depositReturnDescription || undefined },
        },
        token
      );
      setCreatedContractId(contract.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el contrato');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGeneratePdfNow = async () => {
    if (!token || !createdContractId) return;
    setIsGeneratingPdf(true);
    try {
      await contractsApi.generatePdf(createdContractId, token);
      router.push('/contracts');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al generar el PDF', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // ---- Success screen ----
  if (createdContractId) {
    return (
      <ProtectedRoute requiredRole="ADMIN">
        <div className="max-w-lg mx-auto text-center py-12">
          <CheckCircleIcon className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-heading mb-2">Contrato creado</h1>
          <p className="text-muted mb-8">
            Se generó el calendario completo de pagos mensuales para este contrato. Ya puedes generar el PDF para
            imprimir y firmar.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleGeneratePdfNow}
              disabled={isGeneratingPdf || !form.templateId}
              className="bg-primary hover:bg-primary-pressed text-white py-3 rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {isGeneratingPdf ? 'Generando...' : 'Generar PDF ahora'}
            </button>
            <button
              onClick={() => router.push('/contracts')}
              className="text-muted py-3 rounded-xl text-sm font-medium hover:bg-surface"
            >
              Ir a Contratos
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (isLoadingData) {
    return (
      <ProtectedRoute requiredRole="ADMIN">
        <p className="text-muted">Cargando...</p>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className="max-w-xl mx-auto">
        <button
          onClick={() => (step === 0 ? router.push('/contracts') : setStep(step - 1))}
          className="flex items-center gap-1.5 text-muted hover:text-heading text-sm mb-4 -ml-1"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          {step === 0 ? 'Contratos' : STEP_LABELS[step - 1]}
        </button>

        {/* Progress bar */}
        <div className="flex gap-1.5 mb-2">
          {STEP_LABELS.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-black/10 dark:bg-white/10'}`} />
          ))}
        </div>
        <p className="text-xs text-muted mb-6">
          Paso {step + 1} de {STEP_LABELS.length}
        </p>

        <h1 className="text-xl font-bold text-heading mb-5">{STEP_LABELS[step]}</h1>

        <div className="bg-surface rounded-2xl shadow-sm p-5 space-y-4">
          {/* Step 0: Tenant */}
          {step === 0 && (
            <>
              {!showNewTenantForm ? (
                <>
                  <input
                    type="text"
                    placeholder="Buscar por nombre o teléfono..."
                    value={tenantSearch}
                    onChange={(e) => setTenantSearch(e.target.value)}
                    className={inputClass}
                  />
                  <div className="max-h-72 overflow-y-auto -mx-1 px-1 space-y-2">
                    {filteredTenants.length === 0 ? (
                      <p className="text-muted text-sm py-4 text-center">Sin resultados.</p>
                    ) : (
                      filteredTenants.map((tenant) => (
                        <button
                          key={tenant.id}
                          onClick={() => setForm((prev) => ({ ...prev, tenantId: tenant.id }))}
                          className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                            form.tenantId === tenant.id
                              ? 'border-primary bg-primary/10'
                              : 'border-black/10 dark:border-white/10 hover:bg-canvas'
                          }`}
                        >
                          <p className="text-heading font-medium text-sm">{tenant.fullName}</p>
                          <p className="text-muted text-xs">{tenant.phone || 'Sin teléfono'}</p>
                        </button>
                      ))
                    )}
                  </div>
                  <button
                    onClick={() => setShowNewTenantForm(true)}
                    className="w-full text-primary text-sm font-medium py-2.5 rounded-xl border border-dashed border-primary/40 hover:bg-primary/5"
                  >
                    + Crear inquilino nuevo
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label className={labelClass}>Nombre completo</label>
                    <input
                      type="text"
                      value={newTenant.fullName}
                      onChange={(e) => setNewTenant({ ...newTenant, fullName: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Teléfono</label>
                      <input
                        type="tel"
                        value={newTenant.phone ?? ''}
                        onChange={(e) => setNewTenant({ ...newTenant, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        maxLength={10}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Email</label>
                      <input
                        type="email"
                        value={newTenant.email ?? ''}
                        onChange={(e) => setNewTenant({ ...newTenant, email: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Identificación (INE/CURP)</label>
                    <input
                      type="text"
                      value={newTenant.idDocument ?? ''}
                      onChange={(e) => setNewTenant({ ...newTenant, idDocument: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowNewTenantForm(false)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted hover:bg-canvas"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleCreateTenant}
                      disabled={!newTenant.fullName || isCreatingTenant}
                      className="flex-1 bg-primary hover:bg-primary-pressed text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                    >
                      {isCreatingTenant ? 'Creando...' : 'Crear y seleccionar'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* Step 1: Property + dates */}
          {step === 1 && (
            <>
              <div>
                <label className={labelClass}>Propiedad</label>
                <select value={form.propertyId} onChange={(e) => handleSelectProperty(e.target.value)} className={inputClass}>
                  <option value="" disabled>
                    Selecciona una propiedad
                  </option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name} — {property.city} {property.status === 'OCUPADA' ? '(ocupada)' : ''}
                    </option>
                  ))}
                </select>
                {selectedProperty?.status === 'OCUPADA' && (
                  <p className="text-amber-600 dark:text-amber-400 text-xs mt-1.5">
                    Esta propiedad ya figura como ocupada. Verifica que no tenga otro contrato activo vigente.
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Fecha de inicio</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Duración (meses)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.durationMonths}
                    onChange={(e) => setForm({ ...form, durationMonths: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Día de pago (1-31)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={form.paymentDay}
                  onChange={(e) => setForm({ ...form, paymentDay: e.target.value })}
                  className={inputClass}
                />
                <p className="text-xs text-muted mt-1">Los pagos se vencen en este día de cada mes</p>
              </div>
            </>
          )}

          {/* Step 2: Rent & deposit */}
          {step === 2 && (
            <>
              {selectedProperty && (
                <p className="text-xs text-muted bg-canvas rounded-lg px-3 py-2">
                  Precio de lista de {selectedProperty.name}: ${Number(selectedProperty.rentalPrice).toLocaleString('es-MX')}
                  /mes. Puedes ajustar la renta pactada para este contrato específico.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Renta mensual pactada</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.monthlyRent}
                    onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Depósito en garantía</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.depositAmount}
                    onChange={(e) => setForm({ ...form, depositAmount: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-heading">
                <input
                  type="checkbox"
                  checked={form.waterIncluded}
                  onChange={(e) => setForm({ ...form, waterIncluded: e.target.checked })}
                  className="rounded"
                />
                Agua incluida en la renta
              </label>
              <p className="text-xs text-muted">
                Se creará automáticamente un pago mensual pendiente por este monto durante todo el plazo del
                contrato.
              </p>
            </>
          )}

          {/* Step 3: Representative + template */}
          {step === 3 && (
            <>
              <div>
                <label className={labelClass}>Representante (quién firma)</label>
                <select
                  value={form.representativeId}
                  onChange={(e) => setForm({ ...form, representativeId: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Sin asignar</option>
                  {representatives.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.fullName} {rep.position ? `— ${rep.position}` : ''}
                    </option>
                  ))}
                </select>
                {representatives.length === 0 && (
                  <p className="text-muted text-xs mt-1.5">
                    No hay representantes activos. Puedes agregarlos en Configuración → Representantes.
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>Plantilla de contrato</label>
                <select
                  value={form.templateId}
                  onChange={(e) => setForm({ ...form, templateId: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Sin plantilla (no se podrá generar PDF)</option>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Step 4: Conditions */}
          {step === 4 && (
            <>
              <label className="flex items-center gap-2 text-sm text-heading">
                <input
                  type="checkbox"
                  checked={form.autoRenewal}
                  onChange={(e) => setForm({ ...form, autoRenewal: e.target.checked })}
                  className="rounded"
                />
                Renovación automática al finalizar
              </label>
              {selectedProperty?.propertyType === 'HOUSE' && (
                <label className="flex items-center gap-2 text-sm text-heading">
                  <input
                    type="checkbox"
                    checked={form.hasParking}
                    onChange={(e) => setForm({ ...form, hasParking: e.target.checked })}
                    className="rounded"
                  />
                  Establecer espacio de estacionamiento
                </label>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Penalización por retraso (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="Ej: 2"
                    value={form.latePaymentPercentage}
                    onChange={(e) => setForm({ ...form, latePaymentPercentage: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Cargo máximo por daños</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.maxDamageCharge}
                    onChange={(e) => setForm({ ...form, maxDamageCharge: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Política de devolución de depósito</label>
                <textarea
                  value={form.depositReturnDescription}
                  onChange={(e) => setForm({ ...form, depositReturnDescription: e.target.value })}
                  rows={2}
                  placeholder="Ej: 100% si la propiedad se entrega en buen estado, 50% si hay daños menores, 0% si hay daños mayores."
                  className={inputClass}
                />
              </div>
            </>
          )}

          {/* Step 5: Review */}
          {step === 5 && (() => {
            // Calculate end date for display
            const startDate = new Date(form.startDate);
            const endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + Number(form.durationMonths));
            const endDateStr = endDate.toISOString().split('T')[0];

            return (
            <div className="space-y-1">
              {[
                ['Inquilino', selectedTenant?.fullName ?? '—'],
                ['Propiedad', selectedProperty?.name ?? '—'],
                ['Vigencia', `${form.startDate} — ${endDateStr} (${form.durationMonths} meses)`],
                ['Día de pago', `Día ${form.paymentDay} de cada mes`],
                ['Renta mensual', `$${Number(form.monthlyRent || 0).toLocaleString('es-MX')}`],
                ['Depósito', `$${Number(form.depositAmount || 0).toLocaleString('es-MX')}`],
                ['Agua incluida', form.waterIncluded ? 'Sí' : 'No'],
                ...(selectedProperty?.propertyType === 'HOUSE'
                  ? [['Estacionamiento', form.hasParking ? 'Sí, 1 cajón' : 'No']]
                  : []),
                ['Representante', selectedRepresentative?.fullName ?? 'Sin asignar'],
                ['Plantilla', selectedTemplate?.name ?? 'Sin plantilla'],
                ['Renovación automática', form.autoRenewal ? 'Sí' : 'No'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b border-black/5 dark:border-white/10 last:border-0 text-sm">
                  <span className="text-muted">{label}</span>
                  <span className="text-heading font-medium text-right">{value}</span>
                </div>
              ))}
              {error && <p className="text-red-600 dark:text-red-400 text-sm pt-2">{error}</p>}
            </div>
            );
          })()}
        </div>

        {/* Navigation */}
        {!(step === 0 && showNewTenantForm) && (
          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-muted bg-surface hover:bg-canvas"
              >
                Atrás
              </button>
            )}
            {step < STEP_LABELS.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex-1 bg-primary hover:bg-primary-pressed text-white py-3 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                Siguiente
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-primary hover:bg-primary-pressed text-white py-3 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {isSubmitting ? 'Creando...' : 'Crear contrato'}
              </button>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
