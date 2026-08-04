'use client';

import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Modal } from '@/components/Modal';
import { useAuth } from '@/hooks/useAuth';
import { rentPaymentsApi, contractsApi, RentPayment, RentPaymentInput, Contract, buildWhatsAppReminderUrl } from '@/lib/api';
import { formatDate } from '@/lib/formatDate';
import { WhatsAppIcon } from '@/components/icons';

interface PaymentFormState {
  contractId: string;
  dueDate: string;
  amountDue: string;
  amountPaid: string;
  paidDate: string;
  paymentMethod: RentPaymentInput['paymentMethod'];
  notes: string;
}

const emptyForm: PaymentFormState = {
  contractId: '',
  dueDate: '',
  amountDue: '',
  amountPaid: '',
  paidDate: '',
  paymentMethod: 'MANUAL',
  notes: '',
};

const statusLabels: Record<RentPayment['status'], string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  OVERDUE: 'Vencido',
};

const statusColors: Record<RentPayment['status'], string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  PAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  OVERDUE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const methodLabels: Record<RentPaymentInput['paymentMethod'], string> = {
  MANUAL: 'Manual',
  TRANSFERENCIA: 'Transferencia',
  EFECTIVO: 'Efectivo',
  CHEQUE: 'Cheque',
};

export default function PaymentsPage() {
  const { token } = useAuth();
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PaymentFormState>(emptyForm);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [paymentsData, contractsData] = await Promise.all([
        rentPaymentsApi.list(token),
        contractsApi.list(token),
      ]);
      setPayments(paymentsData);
      setContracts(contractsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar pagos');
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
    const defaultContract = contracts[0];
    setForm({
      ...emptyForm,
      contractId: defaultContract?.id ?? '',
      amountDue: defaultContract?.monthlyRent ?? '',
    });
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (payment: RentPayment) => {
    setEditingId(payment.id);
    setForm({
      contractId: payment.contractId,
      dueDate: payment.dueDate.slice(0, 10),
      amountDue: payment.amountDue,
      amountPaid: payment.amountPaid,
      paidDate: payment.paidDate ? payment.paidDate.slice(0, 10) : '',
      paymentMethod: payment.paymentMethod,
      notes: payment.notes ?? '',
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleContractChange = (contractId: string) => {
    const contract = contracts.find((c) => c.id === contractId);
    setForm((prev) => ({
      ...prev,
      contractId,
      amountDue: contract ? contract.monthlyRent : prev.amountDue,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError('');
    setIsSaving(true);

    try {
      const payload: RentPaymentInput = {
        contractId: form.contractId,
        dueDate: form.dueDate,
        amountDue: Number(form.amountDue),
        amountPaid: form.amountPaid ? Number(form.amountPaid) : 0,
        paidDate: form.paidDate || undefined,
        paymentMethod: form.paymentMethod,
        notes: form.notes || undefined,
      };

      if (editingId) {
        await rentPaymentsApi.update(editingId, payload, token);
      } else {
        await rentPaymentsApi.create(payload, token);
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
    if (!confirm('¿Eliminar este pago? Esta acción no se puede deshacer.')) return;
    try {
      await rentPaymentsApi.remove(id, token);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  const handleMarkPaid = async (payment: RentPayment) => {
    if (!token) return;
    setActionLoadingId(payment.id);
    try {
      await rentPaymentsApi.markPaid(payment.id, payment.paymentMethod, token);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al marcar como pagado');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDownloadReceipt = async (id: string) => {
    if (!token) return;
    try {
      await rentPaymentsApi.downloadReceipt(id, token);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al descargar el recibo');
    }
  };

  const handleWhatsAppReminder = (payment: RentPayment) => {
    if (!payment.tenant?.phone) {
      alert('Este inquilino no tiene teléfono registrado.');
      return;
    }
    window.open(buildWhatsAppReminderUrl(payment), '_blank');
  };

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold text-heading">Pagos</h1>
        <button
          onClick={openCreateModal}
          disabled={contracts.length === 0}
          className="bg-primary hover:bg-primary-pressed text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 self-start sm:self-auto active:opacity-80"
        >
          + Cargo extra
        </button>
      </div>
      <Link href="/contracts" className="inline-block text-sm text-primary hover:underline mb-2">
        Ver contratos →
      </Link>
      <p className="text-sm text-muted mb-6">
        Los pagos mensuales se generan automáticamente al crear un contrato. Usa &quot;+ Cargo extra&quot; solo para cobros adicionales.
      </p>

      {contracts.length === 0 && !isLoading && (
        <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 rounded-2xl p-4 mb-6 text-sm">
          Registra primero un contrato para poder registrar pagos.
        </div>
      )}

      {isLoading ? (
        <p className="text-muted">Cargando...</p>
      ) : payments.length === 0 ? (
        <div className="bg-surface rounded-2xl p-8 text-center text-muted">No hay pagos registrados.</div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="sm:hidden space-y-3">
            {payments.map((payment) => (
              <div key={payment.id} className="bg-surface rounded-2xl shadow-sm p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <p className="text-heading font-semibold truncate">{payment.tenant?.fullName ?? '—'}</p>
                    <p className="text-muted text-sm truncate">{payment.property?.name ?? '—'}</p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[payment.status]}`}>
                    {statusLabels[payment.status]}
                  </span>
                </div>
                <p className="text-xs text-muted mb-3">
                  Vence {formatDate(payment.dueDate)} · ${Number(payment.amountDue).toLocaleString('es-MX')}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-3 border-t border-black/5 dark:border-white/10 text-sm font-medium">
                  {payment.status !== 'PAID' && (
                    <>
                      <button
                        onClick={() => handleMarkPaid(payment)}
                        disabled={actionLoadingId === payment.id}
                        className="text-primary disabled:opacity-50"
                      >
                        Marcar pagado
                      </button>
                      <button onClick={() => handleWhatsAppReminder(payment)} className="text-primary flex items-center gap-1">
                        <WhatsAppIcon className="w-4 h-4" /> Recordar
                      </button>
                    </>
                  )}
                  {payment.status === 'PAID' && (
                    <button onClick={() => handleDownloadReceipt(payment.id)} className="text-primary">
                      Recibo
                    </button>
                  )}
                  <button onClick={() => openEditModal(payment)} className="text-primary">
                    Editar
                  </button>
                  <button onClick={() => handleDelete(payment.id)} className="text-red-600">
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block bg-surface rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-canvas text-muted text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Inquilino</th>
                  <th className="px-4 py-3 font-medium">Propiedad</th>
                  <th className="px-4 py-3 font-medium">Vencimiento</th>
                  <th className="px-4 py-3 font-medium">Adeudado</th>
                  <th className="px-4 py-3 font-medium">Pagado</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/10">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-4 py-3 text-heading font-medium">{payment.tenant?.fullName ?? '—'}</td>
                    <td className="px-4 py-3 text-muted">{payment.property?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">{formatDate(payment.dueDate)}</td>
                    <td className="px-4 py-3 text-muted">${Number(payment.amountDue).toLocaleString('es-MX')}</td>
                    <td className="px-4 py-3 text-muted">${Number(payment.amountPaid).toLocaleString('es-MX')}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusColors[payment.status]}`}
                      >
                        {statusLabels[payment.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-x-3 gap-y-1">
                        {payment.status !== 'PAID' && (
                          <>
                            <button
                              onClick={() => handleMarkPaid(payment)}
                              disabled={actionLoadingId === payment.id}
                              className="text-primary hover:underline disabled:opacity-50"
                            >
                              Marcar pagado
                            </button>
                            <button onClick={() => handleWhatsAppReminder(payment)} className="text-primary hover:underline">
                              WhatsApp
                            </button>
                          </>
                        )}
                        {payment.status === 'PAID' && (
                          <button onClick={() => handleDownloadReceipt(payment.id)} className="text-primary hover:underline">
                            Recibo
                          </button>
                        )}
                        <button onClick={() => openEditModal(payment)} className="text-primary hover:underline">
                          Editar
                        </button>
                        <button onClick={() => handleDelete(payment.id)} className="text-red-600 hover:underline">
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Editar pago' : 'Registrar cargo extra'}
      >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-heading mb-1">Contrato</label>
              <select
                value={form.contractId}
                onChange={(e) => handleContractChange(e.target.value)}
                required
                disabled={!!editingId}
                className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
              >
                <option value="" disabled>
                  Selecciona un contrato
                </option>
                {contracts.map((contract) => (
                  <option key={contract.id} value={contract.id}>
                    {contract.tenant?.fullName} — {contract.property?.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-heading mb-1">Fecha de vencimiento</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-heading mb-1">Fecha de pago</label>
                <input
                  type="date"
                  value={form.paidDate}
                  onChange={(e) => setForm({ ...form, paidDate: e.target.value })}
                  className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-heading mb-1">Monto adeudado</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amountDue}
                  onChange={(e) => setForm({ ...form, amountDue: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-heading mb-1">Monto pagado</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amountPaid}
                  onChange={(e) => setForm({ ...form, amountPaid: e.target.value })}
                  className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-heading mb-1">Método de pago</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as RentPaymentInput['paymentMethod'] })}
                className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {Object.entries(methodLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-heading mb-1">Notas</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
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
    </ProtectedRoute>
  );
}
