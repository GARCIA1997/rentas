'use client';

import { useEffect, useState, FormEvent } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminNavbar } from '@/components/AdminNavbar';
import { Modal } from '@/components/Modal';
import { useAuth } from '@/hooks/useAuth';
import { propertiesApi, Property, PropertyInput } from '@/lib/api';

const emptyForm: PropertyInput = {
  name: '',
  address: '',
  city: '',
  postalCode: '',
  propertyType: 'HOUSE',
  status: 'LIBRE',
  rentalPrice: '' as unknown as string,
  waterIncluded: false,
  maintenanceNotes: '',
};

const statusLabels: Record<Property['status'], string> = {
  OCUPADA: 'Ocupada',
  LIBRE: 'Libre',
  MANTENIMIENTO: 'Mantenimiento',
};

const statusColors: Record<Property['status'], string> = {
  OCUPADA: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  LIBRE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  MANTENIMIENTO: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function PropertiesPage() {
  const { token } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PropertyInput>(emptyForm);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadProperties = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await propertiesApi.list(token);
      setProperties(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar propiedades');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (property: Property) => {
    setEditingId(property.id);
    setForm({
      name: property.name,
      address: property.address,
      city: property.city,
      postalCode: property.postalCode,
      propertyType: property.propertyType,
      status: property.status,
      rentalPrice: property.rentalPrice,
      waterIncluded: property.waterIncluded,
      maintenanceNotes: property.maintenanceNotes ?? '',
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
      const payload = { ...form, rentalPrice: Number(form.rentalPrice) as unknown as string };
      if (editingId) {
        await propertiesApi.update(editingId, payload, token);
      } else {
        await propertiesApi.create(payload, token);
      }
      setIsModalOpen(false);
      await loadProperties();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    if (!confirm('¿Eliminar esta propiedad? Esta acción no se puede deshacer.')) return;
    try {
      await propertiesApi.remove(id, token);
      await loadProperties();
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
            <h1 className="text-2xl font-bold text-heading">Propiedades</h1>
            <button
              onClick={openCreateModal}
              className="bg-primary hover:bg-primary-pressed text-white px-4 py-2 rounded-lg text-sm font-medium self-start sm:self-auto"
            >
              + Nueva propiedad
            </button>
          </div>

          {isLoading ? (
            <p className="text-muted">Cargando...</p>
          ) : properties.length === 0 ? (
            <div className="bg-surface rounded-lg p-8 text-center text-muted">
              No hay propiedades registradas.
            </div>
          ) : (
            <div className="bg-surface rounded-lg shadow overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-canvas text-muted text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">Ciudad</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Renta</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Inquilinos</th>
                    <th className="px-4 py-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/10">
                  {properties.map((property) => (
                    <tr key={property.id}>
                      <td className="px-4 py-3 text-heading font-medium">{property.name}</td>
                      <td className="px-4 py-3 text-muted">{property.city}</td>
                      <td className="px-4 py-3 text-muted">
                        {property.propertyType === 'HOUSE' ? 'Casa' : 'Local'}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        ${Number(property.rentalPrice).toLocaleString('es-MX')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[property.status]}`}
                        >
                          {statusLabels[property.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted">{property._count?.tenants ?? 0}</td>
                      <td className="px-4 py-3 text-right space-x-3">
                        <button
                          onClick={() => openEditModal(property)}
                          className="text-primary hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(property.id)}
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
          title={editingId ? 'Editar propiedad' : 'Nueva propiedad'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-heading mb-1">Nombre</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-heading mb-1">Dirección</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                required
                className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-heading mb-1">Ciudad</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-heading mb-1">Código Postal</label>
                <input
                  type="text"
                  value={form.postalCode}
                  onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-heading mb-1">Tipo</label>
                <select
                  value={form.propertyType}
                  onChange={(e) => setForm({ ...form, propertyType: e.target.value as PropertyInput['propertyType'] })}
                  className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="HOUSE">Casa</option>
                  <option value="LOCAL">Local</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-heading mb-1">Estado</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as PropertyInput['status'] })}
                  className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="LIBRE">Libre</option>
                  <option value="OCUPADA">Ocupada</option>
                  <option value="MANTENIMIENTO">Mantenimiento</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-heading mb-1">Renta mensual</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.rentalPrice}
                  onChange={(e) => setForm({ ...form, rentalPrice: e.target.value as unknown as string })}
                  required
                  className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-heading pb-2">
                <input
                  type="checkbox"
                  checked={form.waterIncluded}
                  onChange={(e) => setForm({ ...form, waterIncluded: e.target.checked })}
                  className="rounded"
                />
                Agua incluida
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-heading mb-1">Notas de mantenimiento</label>
              <textarea
                value={form.maintenanceNotes ?? ''}
                onChange={(e) => setForm({ ...form, maintenanceNotes: e.target.value })}
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
      </div>
    </ProtectedRoute>
  );
}
