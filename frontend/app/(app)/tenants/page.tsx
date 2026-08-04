'use client';
import Link from 'next/link';
import { useEffect, useState, FormEvent } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Modal } from '@/components/Modal';
import { useAuth } from '@/hooks/useAuth';
import { tenantsApi, Tenant, TenantInput } from '@/lib/api';

const emptyForm: TenantInput = {
  fullName: '',
  email: '',
  phone: '',
  idDocument: '',
  status: 'ACTIVE',
};

const statusLabels: Record<Tenant['status'], string> = {
  ACTIVE: 'Activo',
  EVICTED: 'Desalojado',
  MOVED_OUT: 'Mudanza',
};

const statusColors: Record<Tenant['status'], string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  EVICTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  MOVED_OUT: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export default function TenantsPage() {
  const { token } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TenantInput>(emptyForm);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      setTenants(await tenantsApi.list(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar inquilinos');
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
    setForm(emptyForm);
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (tenant: Tenant) => {
    setEditingId(tenant.id);
    setForm({
      fullName: tenant.fullName,
      email: tenant.email ?? '',
      phone: tenant.phone ?? '',
      idDocument: tenant.idDocument ?? '',
      status: tenant.status,
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError('');
    setIsSaving(true);

    try {
      if (editingId) {
        await tenantsApi.update(editingId, form, token);
      } else {
        await tenantsApi.create(form, token);
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
    if (!confirm('¿Eliminar este inquilino? Esta acción no se puede deshacer.')) return;
    try {
      await tenantsApi.remove(id, token);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-heading">Inquilinos</h1>
        <button
          onClick={openCreateModal}
          className="bg-primary hover:bg-primary-pressed text-white px-4 py-2.5 rounded-xl text-sm font-medium self-start sm:self-auto active:opacity-80"
        >
          + Nuevo inquilino
        </button>
      </div>
      <p className="text-sm text-muted -mt-4 mb-6">
        Aquí solo se capturan los datos personales. La propiedad y la fecha de ingreso se asignan al crear su contrato.
      </p>

      {isLoading ? (
        <p className="text-muted">Cargando...</p>
      ) : tenants.length === 0 ? (
        <div className="bg-surface rounded-2xl p-8 text-center text-muted">No hay inquilinos registrados.</div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="sm:hidden space-y-3">
            {tenants.map((tenant) => {
              const currentProperty = tenant.contracts?.[0]?.property;
              return (
                <div key={tenant.id} className="bg-surface rounded-2xl shadow-sm p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-heading font-semibold truncate">{tenant.fullName}</p>
                      <p className="text-muted text-sm truncate">{tenant.phone || 'Sin teléfono'}</p>
                      {currentProperty && (
                        <p className="text-xs text-muted mt-1 truncate">Vive en: {currentProperty.name}</p>
                      )}
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[tenant.status]}`}>
                      {statusLabels[tenant.status]}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-3 pt-3 border-t border-black/5 dark:border-white/10 text-sm font-medium">
                    <Link href={`/tenants/${tenant.id}/profile`} className="text-primary text-sm font-medium hover:underline">
                      Ver perfil
                    </Link>
                    <button onClick={() => openEditModal(tenant)} className="text-primary text-sm font-medium">
                      Editar
                    </button>
                    <button onClick={() => handleDelete(tenant.id)} className="text-red-600 text-sm font-medium">
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block bg-surface rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-canvas text-muted text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Teléfono</th>
                  <th className="px-4 py-3 font-medium">Propiedad actual</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/10">
                {tenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td className="px-4 py-3 text-heading font-medium">{tenant.fullName}</td>
                    <td className="px-4 py-3 text-muted">{tenant.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-muted">{tenant.contracts?.[0]?.property.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[tenant.status]}`}>
                        {statusLabels[tenant.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-3">
                      <button onClick={() => openEditModal(tenant)} className="text-primary hover:underline">
                        Editar
                      </button>
                      <button onClick={() => handleDelete(tenant.id)} className="text-red-600 hover:underline">
                        Eliminar
                      </button>
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
        title={editingId ? 'Editar inquilino' : 'Nuevo inquilino'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-heading mb-1">Nombre completo</label>
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
              className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-heading mb-1">Teléfono</label>
              <input
                type="tel"
                value={form.phone ?? ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                maxLength={10}
                className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-heading mb-1">Email</label>
              <input
                type="email"
                value={form.email ?? ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-heading mb-1">Identificación (INE/CURP)</label>
            <input
              type="text"
              value={form.idDocument ?? ''}
              onChange={(e) => setForm({ ...form, idDocument: e.target.value })}
              className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-heading mb-1">Estado</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as TenantInput['status'] })}
              className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ACTIVE">Activo</option>
              <option value="EVICTED">Desalojado</option>
              <option value="MOVED_OUT">Mudanza</option>
            </select>
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
