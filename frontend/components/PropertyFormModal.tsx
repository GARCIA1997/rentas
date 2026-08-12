'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Modal } from './Modal';
import { useAuth } from '@/hooks/useAuth';
import { propertiesApi, Property, PropertyInput, VALID_CITIES } from '@/lib/api';

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

// Campos que el formulario necesita leer/editar. Se acepta este subconjunto (en vez de
// `Property` completo) para que tanto la lista como el perfil de propiedad puedan pasar
// el objeto que ya tengan cargado (`Property` o `PropertyDetail`) sin conversiones.
type EditableProperty = Pick<
  Property,
  | 'id'
  | 'name'
  | 'address'
  | 'city'
  | 'postalCode'
  | 'propertyType'
  | 'status'
  | 'rentalPrice'
  | 'waterIncluded'
  | 'bedrooms'
  | 'bathrooms'
  | 'maintenanceNotes'
>;

export function PropertyFormModal({
  isOpen,
  onClose,
  property,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  property?: EditableProperty | null;
  onSaved: () => void;
}) {
  const { token } = useAuth();
  const [form, setForm] = useState<PropertyInput>(emptyForm);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setForm(
      property
        ? {
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
          }
        : emptyForm
    );
  }, [isOpen, property]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError('');
    setIsSaving(true);

    try {
      const payload = { ...form, rentalPrice: Number(form.rentalPrice) as unknown as string };
      if (property) {
        await propertiesApi.update(property.id, payload, token);
      } else {
        await propertiesApi.create(payload, token);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={property ? 'Editar propiedad' : 'Nueva propiedad'}>
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
            {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
