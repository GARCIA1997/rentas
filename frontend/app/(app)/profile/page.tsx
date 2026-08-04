'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { meApi, MyTenant, Contract, RentPayment } from '@/lib/api';
import { formatDate } from '@/lib/formatDate';
import { useToast } from '@/components/ToastProvider';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-black/5 dark:border-white/10 last:border-0 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-heading font-medium text-right">{value}</span>
    </div>
  );
}

function AdminProfile() {
  const { user } = useAuth();
  return (
    <div className="bg-surface rounded-2xl shadow-sm p-5">
      <Row label="Nombre" value={`${user?.firstName} ${user?.lastName}`} />
      <Row label="Teléfono" value={user?.phone} />
      <Row label="Rol" value="Administrador" />
    </div>
  );
}

function TenantProfile() {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const [tenant, setTenant] = useState<MyTenant | null | undefined>(undefined);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    Promise.all([meApi.getTenant(token), meApi.getContracts(token), meApi.getPayments(token)])
      .then(([tenantData, contractsData, paymentsData]) => {
        setTenant(tenantData);
        setContracts(contractsData);
        setPayments(paymentsData);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const handleDownloadContract = async (id: string) => {
    if (!token) return;
    setDownloadingId(id);
    try {
      await meApi.downloadContractPdf(id, token);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al descargar el contrato', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) {
    return <p className="text-muted">Cargando...</p>;
  }

  if (!tenant) {
    return (
      <div className="bg-surface rounded-2xl shadow-sm p-6">
        <p className="text-muted">
          Tu cuenta aún no está vinculada a ningún contrato. Contacta al administrador si crees que esto es un
          error.
        </p>
      </div>
    );
  }

  const activeContract = contracts.find((c) => c.status === 'ACTIVE') ?? contracts[0];

  // Calculate punctuality: % of payments that were paid on or before due date
  const paidPayments = payments.filter((p) => p.status === 'PAID');
  const punctualPayments = paidPayments.filter((p) => {
    if (!p.paidDate) return false;
    return new Date(p.paidDate) <= new Date(p.dueDate);
  });
  const punctualityPercent = paidPayments.length > 0 ? Math.round((punctualPayments.length / paidPayments.length) * 100) : 0;

  // Get recent payments (last 5)
  const recentPayments = [...payments].sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-2xl shadow-sm p-5">
        <h3 className="text-heading font-semibold mb-2">Datos personales</h3>
        <Row label="Nombre" value={tenant.fullName} />
        <Row label="Teléfono" value={tenant.phone ?? '—'} />
        <Row label="Email" value={tenant.email ?? '—'} />
        <Row label="Identificación" value={tenant.idDocument ?? '—'} />
      </div>

      {tenant.currentProperty && (
        <div className="bg-surface rounded-2xl shadow-sm p-5">
          <h3 className="text-heading font-semibold mb-2">Propiedad</h3>
          <Row label="Nombre" value={tenant.currentProperty.name} />
          <Row label="Dirección" value={`${tenant.currentProperty.address}, ${tenant.currentProperty.city}`} />
          <Row label="Tipo" value={tenant.currentProperty.propertyType === 'HOUSE' ? 'Casa' : 'Local'} />
        </div>
      )}

      <div className="bg-surface rounded-2xl shadow-sm p-5">
        <h3 className="text-heading font-semibold mb-2">Mi contrato</h3>
        {activeContract ? (
          <>
            <Row label="Vigencia" value={`${formatDate(activeContract.startDate)} — ${activeContract.endDate ? formatDate(activeContract.endDate) : '—'}`} />
            <Row label="Renta mensual" value={`$${Number(activeContract.monthlyRent).toLocaleString('es-MX')}`} />
            <Row label="Depósito" value={`$${Number(activeContract.depositAmount).toLocaleString('es-MX')}`} />
            <Row label="Agua incluida" value={activeContract.waterIncluded ? 'Sí' : 'No'} />
            <Row label="Representante" value={activeContract.representative?.fullName ?? '—'} />
            <Row label="Firmado" value={activeContract.signedAt ? formatDate(activeContract.signedAt) : 'Pendiente'} />
            {activeContract.documentUrl && (
              <button
                onClick={() => handleDownloadContract(activeContract.id)}
                disabled={downloadingId === activeContract.id}
                className="mt-4 w-full bg-primary hover:bg-primary-pressed text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {downloadingId === activeContract.id ? 'Descargando...' : 'Descargar contrato PDF'}
              </button>
            )}
          </>
        ) : (
          <p className="text-muted text-sm">Aún no tienes un contrato registrado.</p>
        )}
      </div>

      {/* Payment metrics */}
      {payments.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl shadow-sm p-4 border border-emerald-200 dark:border-emerald-800">
            <p className="text-muted text-xs mb-2">Puntualidad</p>
            <p className="text-heading font-bold text-2xl">{punctualityPercent}%</p>
            <p className="text-muted text-xs mt-1">{punctualPayments.length} de {paidPayments.length} pagos puntuales</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl shadow-sm p-4 border border-blue-200 dark:border-blue-800">
            <p className="text-muted text-xs mb-2">Pagos totales</p>
            <p className="text-heading font-bold text-2xl">{paidPayments.length}</p>
            <p className="text-muted text-xs mt-1">de {payments.length} registrados</p>
          </div>
        </div>
      )}

      {/* Recent payments */}
      {recentPayments.length > 0 && (
        <div className="bg-surface rounded-2xl shadow-sm p-5">
          <h3 className="text-heading font-semibold mb-4">Últimos pagos</h3>
          <div className="space-y-2">
            {recentPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between py-3 border-b border-black/5 dark:border-white/10 last:border-0 text-sm">
                <div>
                  <p className="text-heading font-medium">{formatDate(payment.dueDate)}</p>
                  <p className="text-muted text-xs">
                    ${Number(payment.amountDue).toLocaleString('es-MX')} {payment.paymentNumber && `(${payment.paymentNumber}/${payment.totalPaymentsInContract})`}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    payment.status === 'PAID'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : payment.status === 'OVERDUE'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}
                >
                  {payment.status === 'PAID' ? 'Pagado' : payment.status === 'OVERDUE' ? 'Vencido' : 'Pendiente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold text-heading mb-6">Mi perfil</h1>
      {user?.role === 'ADMIN' ? <AdminProfile /> : <TenantProfile />}
    </div>
  );
}
