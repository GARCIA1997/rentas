'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { tenantsApi, contractsApi, rentPaymentsApi, Tenant, Contract, RentPayment } from '@/lib/api';
import { formatDate } from '@/lib/formatDate';
import { ArrowLeftIcon } from '@/components/icons';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-black/5 dark:border-white/10 last:border-0 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-heading font-medium text-right">{value}</span>
    </div>
  );
}

export default function TenantProfilePage() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tenantId = params?.id as string;

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !tenantId) return;
    loadData();
  }, [token, tenantId]);

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [tenantData, contractsData, paymentsData] = await Promise.all([
        tenantsApi.get(tenantId, token!),
        contractsApi.list(token!),
        rentPaymentsApi.list(token!),
      ]);
      setTenant(tenantData);
      // Filter contracts for this tenant
      setContracts(contractsData.filter((c) => c.tenantId === tenantId));
      // Filter payments for this tenant
      setPayments(paymentsData.filter((p) => p.tenantId === tenantId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute requiredRole="ADMIN">
        <p className="text-muted">Cargando...</p>
      </ProtectedRoute>
    );
  }

  if (!tenant) {
    return (
      <ProtectedRoute requiredRole="ADMIN">
        <div className="space-y-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-muted hover:text-heading text-sm -ml-1"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Atrás
          </button>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-400 text-sm">{error || 'No se pudo cargar el inquilino'}</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const activeContract = contracts.find((c) => c.status === 'ACTIVE');

  // Calculate punctuality
  const paidPayments = payments.filter((p) => p.status === 'PAID');
  const punctualPayments = paidPayments.filter((p) => {
    if (!p.paidDate) return false;
    return new Date(p.paidDate) <= new Date(p.dueDate);
  });
  const punctualityPercent = paidPayments.length > 0 ? Math.round((punctualPayments.length / paidPayments.length) * 100) : 0;

  // Recent payments (last 5)
  const recentPayments = [...payments].sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()).slice(0, 5);

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className="space-y-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-muted hover:text-heading text-sm -ml-1"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Volver
        </button>

        <div>
          <h1 className="text-2xl font-bold text-heading">{tenant.fullName}</h1>
          <p className="text-muted text-sm">Perfil del inquilino</p>
        </div>

        <div className="bg-surface rounded-2xl shadow-sm p-5">
          <h3 className="text-heading font-semibold mb-2">Datos personales</h3>
          <Row label="Nombre" value={tenant.fullName} />
          <Row label="Teléfono" value={tenant.phone ?? '—'} />
          <Row label="Email" value={tenant.email ?? '—'} />
          <Row label="Identificación" value={tenant.idDocument ?? '—'} />
          <Row label="Estado" value={tenant.status} />
        </div>

        {activeContract && (
          <div className="bg-surface rounded-2xl shadow-sm p-5">
            <h3 className="text-heading font-semibold mb-2">Contrato activo</h3>
            <Row label="Propiedad" value={activeContract.property?.name ?? '—'} />
            <Row label="Vigencia" value={`${formatDate(activeContract.startDate)} — ${activeContract.endDate ? formatDate(activeContract.endDate) : '—'}`} />
            <Row label="Renta mensual" value={`$${Number(activeContract.monthlyRent).toLocaleString('es-MX')}`} />
            <Row label="Depósito" value={`$${Number(activeContract.depositAmount).toLocaleString('es-MX')}`} />
            <Row label="Estado" value={activeContract.status} />
            <Link
              href={`/contracts/${activeContract.id}`}
              className="block mt-4 text-primary text-sm font-medium hover:underline"
            >
              Ver contrato completo →
            </Link>
          </div>
        )}

        {contracts.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl shadow-sm p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-muted text-xs mb-2">Contratos totales</p>
              <p className="text-heading font-bold text-2xl">{contracts.length}</p>
            </div>
            <div className={`rounded-2xl shadow-sm p-4 border ${activeContract ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' : 'bg-gray-50 dark:bg-gray-900/10 border-gray-200 dark:border-gray-800'}`}>
              <p className="text-muted text-xs mb-2">Contratos activos</p>
              <p className="text-heading font-bold text-2xl">{contracts.filter((c) => c.status === 'ACTIVE').length}</p>
            </div>
          </div>
        )}

        {payments.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl shadow-sm p-4 border border-emerald-200 dark:border-emerald-800">
                <p className="text-muted text-xs mb-2">Puntualidad</p>
                <p className="text-heading font-bold text-2xl">{punctualityPercent}%</p>
                <p className="text-muted text-xs mt-1">{punctualPayments.length}/{paidPayments.length} puntuales</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl shadow-sm p-4 border border-blue-200 dark:border-blue-800">
                <p className="text-muted text-xs mb-2">Pagos</p>
                <p className="text-heading font-bold text-2xl">{paidPayments.length}</p>
                <p className="text-muted text-xs mt-1">de {payments.length} registrados</p>
              </div>
            </div>

            <div className="bg-surface rounded-2xl shadow-sm p-5">
              <h3 className="text-heading font-semibold mb-4">Últimos pagos</h3>
              <div className="space-y-2">
                {recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between py-3 border-b border-black/5 dark:border-white/10 last:border-0 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="text-heading font-medium">{formatDate(payment.dueDate)}</p>
                      <p className="text-muted text-xs truncate">
                        ${Number(payment.amountDue).toLocaleString('es-MX')} {payment.paymentNumber && `(${payment.paymentNumber}/${payment.totalPaymentsInContract})`}
                      </p>
                    </div>
                    <span
                      className={`ml-2 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
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
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
