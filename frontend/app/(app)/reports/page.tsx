'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { rentPaymentsApi, RentPayment } from '@/lib/api';
import { formatDate } from '@/lib/formatDate';
import { ArrowLeftIcon, DownloadIcon } from '@/components/icons';

export default function ReportsPage() {
  const { token } = useAuth();
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [filtered, setFiltered] = useState<RentPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [filters, setFilters] = useState({
    tenant: '',
    property: '',
    status: 'all' as string,
    type: 'all' as string,
  });

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    rentPaymentsApi.list(token)
      .then(setPayments)
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => {
    let result = payments;

    if (filters.tenant) {
      result = result.filter(p =>
        p.tenant?.fullName.toLowerCase().includes(filters.tenant.toLowerCase())
      );
    }

    if (filters.property) {
      result = result.filter(p =>
        p.property?.name.toLowerCase().includes(filters.property.toLowerCase())
      );
    }

    if (filters.status !== 'all') {
      result = result.filter(p => p.status === filters.status);
    }

    if (filters.type !== 'all') {
      result = result.filter(p => p.paymentType === filters.type);
    }

    setFiltered(result);
  }, [payments, filters]);

  const handleExportCSV = async () => {
    if (!token) return;
    setIsExporting(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/rent-payments/export/csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('No se pudo descargar el CSV');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pagos-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al descargar');
    } finally {
      setIsExporting(false);
    }
  };

  const totalAmount = filtered.reduce((sum, p) => sum + Number(p.amountDue), 0);
  const totalPaid = filtered.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);

  const statusColors: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    PAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    OVERDUE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  const statusLabels: Record<string, string> = {
    PENDING: 'Pendiente',
    PAID: 'Pagado',
    OVERDUE: 'Vencido',
  };

  if (isLoading) {
    return <p className="text-muted">Cargando reportes...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/payments" className="text-muted">
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-heading">Reporte de Pagos</h2>
            <p className="text-sm text-muted">Filtra y descarga datos de pagos</p>
          </div>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={isExporting}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
        >
          <DownloadIcon className="w-4 h-4" />
          {isExporting ? 'Exportando...' : 'Descargar CSV'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-surface rounded-2xl shadow-sm p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-heading mb-2">Inquilino</label>
            <input
              type="text"
              placeholder="Buscar inquilino..."
              value={filters.tenant}
              onChange={(e) => setFilters({ ...filters, tenant: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-heading text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-heading mb-2">Propiedad</label>
            <input
              type="text"
              placeholder="Buscar propiedad..."
              value={filters.property}
              onChange={(e) => setFilters({ ...filters, property: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-heading text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-heading mb-2">Estado</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-heading text-sm"
            >
              <option value="all">Todos los estados</option>
              <option value="PENDING">Pendiente</option>
              <option value="PAID">Pagado</option>
              <option value="OVERDUE">Vencido</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-heading mb-2">Tipo de Pago</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-heading text-sm"
            >
              <option value="all">Todos los tipos</option>
              <option value="RENT">Renta</option>
              <option value="DEPOSIT">Depósito</option>
              <option value="EXTRA">Extra</option>
            </select>
          </div>
        </div>
        {(filters.tenant || filters.property || filters.status !== 'all' || filters.type !== 'all') && (
          <button
            onClick={() => setFilters({ tenant: '', property: '', status: 'all', type: 'all' })}
            className="text-sm text-primary hover:underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-2xl shadow-sm p-5">
          <p className="text-sm text-muted mb-1">Total a cobrar</p>
          <p className="text-2xl font-bold text-heading">${totalAmount.toLocaleString('es-MX')}</p>
          <p className="text-xs text-muted mt-2">{filtered.length} pagos</p>
        </div>
        <div className="bg-surface rounded-2xl shadow-sm p-5">
          <p className="text-sm text-muted mb-1">Total cobrado</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">${totalPaid.toLocaleString('es-MX')}</p>
        </div>
        <div className="bg-surface rounded-2xl shadow-sm p-5">
          <p className="text-sm text-muted mb-1">Por cobrar</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">${(totalAmount - totalPaid).toLocaleString('es-MX')}</p>
        </div>
      </div>

      {/* Table / Cards */}
      {filtered.length === 0 ? (
        <div className="bg-surface rounded-2xl shadow-sm p-8 text-center">
          <p className="text-muted">No hay pagos que coincidan con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-2xl shadow-sm overflow-hidden">
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left text-sm font-medium text-muted">Inquilino</th>
                  <th className="px-5 py-3 text-left text-sm font-medium text-muted">Propiedad</th>
                  <th className="px-5 py-3 text-left text-sm font-medium text-muted">Monto</th>
                  <th className="px-5 py-3 text-left text-sm font-medium text-muted">Vencimiento</th>
                  <th className="px-5 py-3 text-left text-sm font-medium text-muted">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((payment) => (
                  <tr key={payment.id} className="border-b border-border last:border-0 hover:bg-black/2 dark:hover:bg-white/2">
                    <td className="px-5 py-3 text-sm text-heading">{payment.tenant?.fullName}</td>
                    <td className="px-5 py-3 text-sm text-heading">{payment.property?.name}</td>
                    <td className="px-5 py-3 text-sm font-medium text-heading">${Number(payment.amountDue).toLocaleString('es-MX')}</td>
                    <td className="px-5 py-3 text-sm text-muted">{formatDate(payment.dueDate)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusColors[payment.status]}`}>
                        {statusLabels[payment.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sm:hidden space-y-3 p-5">
            {filtered.map((payment) => (
              <div key={payment.id} className="border border-border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-heading font-medium">{payment.tenant?.fullName}</p>
                    <p className="text-muted text-xs">{payment.property?.name}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[payment.status]}`}>
                    {statusLabels[payment.status]}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted text-xs">Monto</p>
                    <p className="font-medium text-heading">${Number(payment.amountDue).toLocaleString('es-MX')}</p>
                  </div>
                  <div>
                    <p className="text-muted text-xs">Vencimiento</p>
                    <p className="font-medium text-heading">{formatDate(payment.dueDate)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
