'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Modal } from './Modal';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from './ToastProvider';
import { rentPaymentsApi, shareReceiptOnWhatsApp, RentPayment } from '@/lib/api';
import { CheckCircleIcon, WhatsAppIcon, DownloadIcon } from './icons';

const paymentMethodLabels: Record<RentPayment['paymentMethod'], string> = {
  MANUAL: 'Manual',
  TRANSFERENCIA: 'Transferencia',
  EFECTIVO: 'Efectivo',
  CHEQUE: 'Cheque',
};

export function PayPaymentModal({
  payment,
  isOpen,
  onClose,
  onPaid,
}: {
  payment: RentPayment | null;
  isOpen: boolean;
  onClose: () => void;
  onPaid: (updated: RentPayment) => void;
}) {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<RentPayment['paymentMethod']>('TRANSFERENCIA');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Once a payment reaches PAID, we switch the modal into a confirmation
  // view with an explicit "send receipt" step, instead of firing the share
  // silently in the background and closing — that's what left the admin
  // unable to send it right then and having to go hunt it down in "Pagados".
  const [completedPayment, setCompletedPayment] = useState<RentPayment | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [receiptSent, setReceiptSent] = useState(false);

  const remaining = payment ? Number(payment.amountDue) - Number(payment.amountPaid || 0) : 0;

  useEffect(() => {
    if (isOpen && payment) {
      setAmount(remaining > 0 ? remaining.toString() : '0');
      setPaymentMethod('TRANSFERENCIA');
      setError('');
      setCompletedPayment(null);
      setReceiptSent(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, payment?.id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !payment) return;

    const parsed = Number(amount);
    if (!parsed || parsed <= 0) {
      setError('Ingresa un monto válido');
      return;
    }
    if (parsed > remaining + 0.01) {
      setError(`El monto no puede superar el saldo pendiente ($${remaining.toLocaleString('es-MX')})`);
      return;
    }

    setError('');
    setIsSaving(true);
    try {
      const newAmountPaid = Number(payment.amountPaid || 0) + parsed;
      const updated = await rentPaymentsApi.update(
        payment.id,
        {
          amountPaid: newAmountPaid,
          paidDate: new Date().toISOString(),
          paymentMethod,
        },
        token
      );

      onPaid(updated);

      if (updated.status === 'PAID') {
        setCompletedPayment(updated);
      } else {
        onClose();
        showToast(
          `Abono registrado. Saldo pendiente: $${(Number(updated.amountDue) - Number(updated.amountPaid)).toLocaleString('es-MX')}`,
          'success'
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar el pago');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendReceipt = async () => {
    if (!token || !completedPayment) return;
    setIsSharing(true);
    try {
      const result = await shareReceiptOnWhatsApp(completedPayment, token);
      setReceiptSent(true);
      if (result === 'fallback') {
        showToast('El recibo se descargó — adjúntalo manualmente en la conversación de WhatsApp que se abrió.', 'success');
      } else if (result === 'shared') {
        showToast('Recibo enviado.', 'success');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo enviar el recibo', 'error');
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!token || !completedPayment) return;
    try {
      await rentPaymentsApi.downloadReceipt(completedPayment.id, token);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo descargar el recibo', 'error');
    }
  };

  if (!payment) return null;

  if (completedPayment) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Pago completado">
        <div className="text-center py-2">
          <CheckCircleIcon className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
          <p className="text-heading font-semibold text-lg mb-1">
            ${Number(completedPayment.amountPaid).toLocaleString('es-MX')} recibidos
          </p>
          <p className="text-muted text-sm mb-6">
            {completedPayment.tenant?.fullName} — {completedPayment.property?.name}
          </p>

          <div className="flex flex-col gap-2.5">
            <button
              onClick={handleSendReceipt}
              disabled={isSharing}
              className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
            >
              <WhatsAppIcon className="w-4 h-4" />
              {isSharing ? 'Enviando...' : receiptSent ? 'Recibo enviado — reenviar' : 'Enviar recibo por WhatsApp'}
            </button>
            <button
              onClick={handleDownloadReceipt}
              className="flex items-center justify-center gap-2 border border-black/10 dark:border-white/10 text-heading px-4 py-3 rounded-xl text-sm font-medium hover:bg-canvas transition-colors"
            >
              <DownloadIcon className="w-4 h-4" />
              Descargar PDF
            </button>
            <button onClick={onClose} className="text-muted text-sm font-medium py-2">
              Cerrar
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar pago">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-canvas rounded-xl p-4 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Monto total</span>
            <span className="text-heading font-medium">${Number(payment.amountDue).toLocaleString('es-MX')}</span>
          </div>
          {Number(payment.amountPaid) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted">Ya abonado</span>
              <span className="text-heading font-medium">${Number(payment.amountPaid).toLocaleString('es-MX')}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted">Saldo pendiente</span>
            <span className="text-heading font-semibold">${remaining.toLocaleString('es-MX')}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-heading mb-1">Monto a pagar</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max={remaining}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {Number(amount) > 0 && Number(amount) < remaining && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
              Pago parcial — quedará un saldo de ${(remaining - Number(amount)).toLocaleString('es-MX')}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-heading mb-1">Método de pago</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as RentPayment['paymentMethod'])}
            className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {Object.entries(paymentMethodLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
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
            {isSaving ? 'Guardando...' : Number(amount) < remaining ? 'Registrar abono' : 'Confirmar pago'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
