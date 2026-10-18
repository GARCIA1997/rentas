'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Modal, btnSecondary, btnConfirm } from './Modal';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from './ToastProvider';
import { rentPaymentsApi, shareReceiptOnWhatsApp, RentPayment } from '@/lib/api';

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

  const methodIcons: Record<RentPayment['paymentMethod'], string> = {
    TRANSFERENCIA: 'account_balance',
    EFECTIVO: 'payments',
    CHEQUE: 'receipt_long',
    MANUAL: 'edit_note',
  };
  const initials = (payment.tenant?.fullName ?? '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  const mx = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Estado de éxito tras registrar el pago (mismos botones de Stitch: verde confirma, azul navega)
  if (completedPayment) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Pago registrado">
        <div className="text-center py-1">
          <div className="w-14 h-14 rounded-full bg-[#2D9E6B]/15 flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined fill text-[#2D9E6B] text-[34px]">check_circle</span>
          </div>
          <p className="font-sans text-headline-sm font-bold text-[#173a5f]">{mx(Number(completedPayment.amountPaid))} recibidos</p>
          <p className="font-sans text-body-sm text-[#73777f] mb-5">
            {completedPayment.tenant?.fullName} — {completedPayment.property?.name}
          </p>
          <div className="flex flex-col gap-2.5">
            <button
              onClick={handleSendReceipt}
              disabled={isSharing}
              type="button"
              className="w-full h-11 rounded-lg bg-[#2D9E6B] hover:bg-[#25855A] text-white font-semibold text-body-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">chat</span>
              {isSharing ? 'Enviando...' : receiptSent ? 'Recibo enviado — reenviar' : 'Enviar recibo por WhatsApp'}
            </button>
            <button
              onClick={handleDownloadReceipt}
              type="button"
              className="w-full h-11 rounded-lg bg-[#173A5F] hover:bg-[#122e4c] text-white font-semibold text-body-md flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">download</span>
              Descargar recibo PDF
            </button>
            <button onClick={onClose} type="button" className={btnSecondary}>
              Cerrar
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // Markup portado de Stitch: design/stitch/modal-pay.html
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar pago">
      <div className="bg-[#f7f3ea] p-3.5 rounded-lg border border-[#e6e2d9] mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-full bg-[#173a5f] text-[#ffffff] flex items-center justify-center font-sans font-bold text-sm">{initials}</div>
          <div className="min-w-0">
            <p className="font-sans text-label-lg font-bold text-[#173a5f] truncate">{payment.tenant?.fullName}</p>
            <p className="font-sans text-body-sm text-[#43474e] flex items-center mt-0.5 truncate">
              <span className="material-symbols-outlined text-[#73777f] text-[16px] mr-1">apartment</span>
              {payment.property?.name}
            </p>
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-[#ece8df] grid grid-cols-2 gap-2 text-left">
          <div>
            <p className="font-sans text-label-sm text-[#73777f]">Folio y periodo</p>
            <p className="font-sans text-body-sm font-semibold text-[#002445]">
              {payment.paymentNumber ? `Pago ${payment.paymentNumber} de ${payment.totalPaymentsInContract} · ` : ''}
              {new Date(payment.dueDate).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="text-right">
            <p className="font-sans text-label-sm text-[#73777f]">Monto exigible</p>
            <p className="font-sans text-headline-sm font-bold text-[#2D9E6B]">
              {mx(Number(payment.amountDue))} <span className="font-sans text-label-sm font-normal text-[#43474e]">MXN</span>
            </p>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-[#ece8df]/60 flex justify-between gap-2 text-label-sm font-sans text-[#73777f]">
          <span>
            Abonado: <strong className="text-[#002445] font-medium">{mx(Number(payment.amountPaid || 0))}</strong>
          </span>
          <span>
            Saldo: <strong className="text-[#ba1a1a] font-semibold">{mx(remaining)}</strong>
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-sans text-label-md text-[#173a5f] mb-1.5 font-bold">
            Monto recibido (MXN) <span className="text-[#ba1a1a]">*</span>
          </label>
          <div className="relative rounded-lg shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <span className="font-sans text-headline-md text-[#002445] font-bold">$</span>
            </div>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={remaining}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="block w-full pl-8 pr-16 py-2.5 font-sans text-headline-md text-[#002445] font-bold bg-[#ffffff] rounded-lg border-2 border-[#2D9E6B] focus:border-[#2D9E6B] focus:outline-none focus:ring-0 transition-colors"
            />
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
              <span className="font-sans text-label-md text-[#73777f] font-semibold">MXN</span>
            </div>
          </div>
        </div>

        {Number(amount) > 0 && Number(amount) < remaining && (
          <div className="flex items-start space-x-2.5 p-3 rounded-lg bg-[#FEF3C7] border border-[#F59E0B]/50 text-[#92400E]">
            <span className="material-symbols-outlined shrink-0 text-[#D9822B] text-[20px] mt-0.5">info</span>
            <p className="font-sans text-body-sm leading-relaxed">
              Abono parcial: quedará un saldo pendiente de {mx(remaining - Number(amount))} en la ficha del inquilino.
            </p>
          </div>
        )}

        <div>
          <label className="block font-sans text-label-md text-[#173a5f] mb-1.5 font-bold">
            Método de pago <span className="text-[#ba1a1a]">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(paymentMethodLabels) as RentPayment['paymentMethod'][]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPaymentMethod(m)}
                className={
                  paymentMethod === m
                    ? 'flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg bg-[#173a5f] text-[#ffffff] font-sans text-label-md shadow-sm border border-[#173a5f] active:scale-95 transition-transform'
                    : 'flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg bg-[#ffffff] text-[#173a5f] font-sans text-label-md border border-[#c3c6cf] hover:bg-[#f7f3ea] active:scale-95 transition-transform'
                }
              >
                <span className={`material-symbols-outlined text-[18px] ${paymentMethod === m ? '' : 'text-[#73777f]'}`}>{methodIcons[m]}</span>
                <span>{paymentMethodLabels[m]}</span>
              </button>
            ))}
          </div>
        </div>

        {error && <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">{error}</div>}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cancelar
          </button>
          <button type="submit" disabled={isSaving} className={btnConfirm}>
            <span className="material-symbols-outlined text-[18px]">payments</span>
            {isSaving ? 'Guardando...' : Number(amount) < remaining ? 'Registrar abono' : 'Registrar pago'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
