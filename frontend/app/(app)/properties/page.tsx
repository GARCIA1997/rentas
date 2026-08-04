'use client';

import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Modal } from '@/components/Modal';
import { useAuth } from '@/hooks/useAuth';
import { propertiesApi, Property, PropertyInput, VALID_CITIES } from '@/lib/api';
import { ChevronRightIcon } from '@/components/icons';

const emptyForm: PropertyInput = {
  name: '',
  address: '',
  city: VALID_CITIES[0],
  postalCode: '',
  propertyType: 'HOUSE',
  status: 'LIBRE',
  rentalPrice: '' as unknown as string,
  waterIncluded: false,
  bedrooms: null,
  bathrooms: null,
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
      bedrooms: property.bedrooms ?? null,
      bathrooms: property.bathrooms ?? null,
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-heading">Propiedades</h1>
        <button
          onClick={openCreateModal}
          className="bg-primary hover:bg-primary-pressed text-white px-4 py-2.5 rounded-xl text-sm font-medium self-start sm:self-auto active:opacity-80"
        >
          + Nueva propiedad
        </button>
      </div>

      {isLoading ? (
        <p className="text-muted">Cargando...</p>
      ) : properties.length === 0 ? (
        <div className="bg-surface rounded-2xl p-8 text-center text-muted">No hay propiedades registradas.</div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="sm:hidden space-y-3">
            {properties.map((property) => {
              const occupant = property.contracts?.[0]?.tenant;
              return (
                <Link
                  key={property.id}
                  href={`/properties/${property.id}`}
                  className="flex items-center justify-between bg-surface rounded-2xl shadow-sm p-4 active:opacity-70 transition-opacity"
                >
                  <div className="min-w-0">
                    <p className="text-heading font-semibold truncate">{property.name}</p>
                    <p className="text-muted text-sm truncate">{property.city}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[property.status]}`}>
                        {statusLabels[property.status]}
                      </span>
                      <span className="text-sm text-heading font-medium">
                        ${Number(property.rentalPrice).toLocaleString('es-MX')}
                      </span>
                    </div>
                    {occupant && <p className="text-xs text-muted mt-1 truncate">Inquilino: {occupant.fullName}</p>}
                  </div>
                  <ChevronRightIcon className="w-5 h-5 text-muted shrink-0 ml-2" />
                </Link>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block bg-surface rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-canvas text-muted text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Ciudad</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Renta</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Inquilino</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/10">
                {properties.map((property) => (
                  <tr key={property.id} className="hover:bg-canvas/50">
                    <td className="px-4 py-3">
                      <Link href={`/properties/${property.id}`} className="text-heading font-medium hover:text-primary">
                        {property.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{property.city}</td>
                    <td className="px-4 py-3 text-muted">{property.propertyType === 'HOUSE' ? 'Casa' : 'Local'}</td>
                    <td className="px-4 py-3 text-muted">${Number(property.rentalPrice).toLocaleString('es-MX')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[property.status]}`}>
                        {statusLabels[property.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">{property.contracts?.[0]?.tenant.fullName ?? '—'}</td>
                    <td className="px-4 py-3 text-right space-x-3">
                      <button onClick={() => openEditModal(property)} className="text-primary hover:underline">
                        Editar
                      </button>
                      <button onClick={() => handleDelete(property.id)} className="text-red-600 hover:underline">
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
              <select
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                required
                className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {VALID_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-heading mb-1">Cuartos</label>
              <input
                type="number"
                min="0"
                value={form.bedrooms ?? ''}
                onChange={(e) => setForm({ ...form, bedrooms: e.target.value ? Number(e.target.value) : null })}
                className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-heading mb-1">Baños</label>
              <input
                type="number"
                min="0"
                value={form.bathrooms ?? ''}
                onChange={(e) => setForm({ ...form, bathrooms: e.target.value ? Number(e.target.value) : null })}
                className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-heading mb-1">Renta mensual (precio de lista)</label>
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
          <p className="text-xs text-muted -mt-2">
            Este es el precio de referencia. La renta pactada de cada contrato se define al generarlo.
          </p>

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
    </ProtectedRoute>
  );
}
