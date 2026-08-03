'use client';

import { useEffect, useState, FormEvent } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminNavbar } from '@/components/AdminNavbar';
import { Modal } from '@/components/Modal';
import { useAuth } from '@/hooks/useAuth';
import { tenantsApi, propertiesApi, Tenant, TenantInput, Property } from '@/lib/api';

const emptyForm: TenantInput = {
  propertyId: '',
  fullName: '',
  email: '',
  phone: '',
  idDocument: '',
  moveInDate: '',
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
  const [properties, setProperties] = useState<Property[]>([]);
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
      const [tenantsData, propertiesData] = await Promise.all([
        tenantsApi.list(token),
        propertiesApi.list(token),
      ]);
      setTenants(tenantsData);
      setProperties(propertiesData);
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
    setForm({ ...emptyForm, propertyId: properties[0]?.id ?? '' });
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (tenant: Tenant) => {
    setEditingId(tenant.id);
    setForm({
      propertyId: tenant.propertyId,
      fullName: tenant.fullName,
      email: tenant.email ?? '',
      phone: tenant.phone ?? '',
      idDocument: tenant.idDocument ?? '',
      moveInDate: tenant.moveInDate.slice(0, 10),
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
      <div className="min-h-screen bg-canvas">
        <AdminNavbar />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
            <h1 className="text-2xl font-bold text-heading">Inquilinos</h1>
            <button
              onClick={openCreateModal}
              disabled={properties.length === 0}
              className="bg-primary hover:bg-primary-pressed text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 self-start sm:self-auto"
            >
              + Nuevo inquilino
            </button>
          </div>

          {properties.length === 0 && !isLoading && (
            <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 rounded-lg p-4 mb-6 text-sm">
              Registra primero una propiedad para poder asignar inquilinos.
            </div>
          )}

          {isLoading ? (
            <p className="text-muted">Cargando...</p>
          ) : tenants.length === 0 ? (
            <div className="bg-surface rounded-lg p-8 text-center text-muted">
              No hay inquilinos registrados.
            </div>
          ) : (
            <div className="bg-surface rounded-lg shadow overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-canvas text-muted text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">Propiedad</th>
                    <th className="px-4 py-3 font-medium">Teléfono</th>
                    <th className="px-4 py-3 font-medium">Ingreso</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/10">
                  {tenants.map((tenant) => (
                    <tr key={tenant.id}>
                      <td className="px-4 py-3 text-heading font-medium">{tenant.fullName}</td>
                      <td className="px-4 py-3 text-muted">{tenant.property?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-muted">{tenant.phone ?? '—'}</td>
                      <td className="px-4 py-3 text-muted">
                        {new Date(tenant.moveInDate).toLocaleDateString('es-MX')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[tenant.status]}`}
                        >
                          {statusLabels[tenant.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-3">
                        <button
                          onClick={() => openEditModal(tenant)}
                          className="text-primary hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(tenant.id)}
                          className="text-red-600 hover:underline"
                        >
                          Eliminar
                        </button>
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
          title={editingId ? 'Editar inquilino' : 'Nuevo inquilino'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-heading mb-1">Propiedad</label>
              <select
                value={form.propertyId}
                onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
                required
                className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="" disabled>
                  Selecciona una propiedad
                </option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name} — {property.city}
                  </option>
                ))}
              </select>
            </div>

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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-heading mb-1">Fecha de ingreso</label>
                <input
                  type="date"
                  value={form.moveInDate}
                  onChange={(e) => setForm({ ...form, moveInDate: e.target.value })}
                  required
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
