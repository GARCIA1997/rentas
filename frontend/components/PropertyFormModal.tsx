'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Modal, fieldLabel, fieldInput, btnSecondary, btnConfirm } from './Modal';
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
          <label className={fieldLabel}>Nombre</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className={fieldInput}
          />
        </div>

        <div>
          <label className={fieldLabel}>Dirección</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            required
            className={fieldInput}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={fieldLabel}>Ciudad</label>
            <select
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              required
              className={fieldInput}
            >
              {VALID_CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={fieldLabel}>Código Postal</label>
            <input
              type="text"
              value={form.postalCode}
              onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
              required
              className={fieldInput}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={fieldLabel}>Tipo</label>
            <select
              value={form.propertyType}
              onChange={(e) => setForm({ ...form, propertyType: e.target.value as PropertyInput['propertyType'] })}
              className={fieldInput}
            >
              <option value="HOUSE">Casa</option>
              <option value="LOCAL">Local</option>
            </select>
          </div>
          <div>
            <label className={fieldLabel}>Estado</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as PropertyInput['status'] })}
              className={fieldInput}
            >
              <option value="LIBRE">Libre</option>
              <option value="OCUPADA">Ocupada</option>
              <option value="MANTENIMIENTO">Mantenimiento</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={fieldLabel}>Cuartos</label>
            <input
              type="number"
              min="0"
              value={form.bedrooms ?? ''}
              onChange={(e) => setForm({ ...form, bedrooms: e.target.value ? Number(e.target.value) : null })}
              className={fieldInput}
            />
          </div>
          <div>
            <label className={fieldLabel}>Baños</label>
            <input
              type="number"
              min="0"
              value={form.bathrooms ?? ''}
              onChange={(e) => setForm({ ...form, bathrooms: e.target.value ? Number(e.target.value) : null })}
              className={fieldInput}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 items-end">
          <div>
            <label className={fieldLabel}>Renta mensual (precio de lista)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.rentalPrice}
              onChange={(e) => setForm({ ...form, rentalPrice: e.target.value as unknown as string })}
              required
              className={fieldInput}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-[#173A5F] pb-2">
            <input
              type="checkbox"
              checked={form.waterIncluded}
              onChange={(e) => setForm({ ...form, waterIncluded: e.target.checked })}
              className="rounded"
            />
            Agua incluida
          </label>
        </div>
        <p className="text-xs text-[#586270] -mt-2">
          Este es el precio de referencia. La renta pactada de cada contrato se define al generarlo.
        </p>

        <div>
          <label className={fieldLabel}>Notas de mantenimiento</label>
          <textarea
            value={form.maintenanceNotes ?? ''}
            onChange={(e) => setForm({ ...form, maintenanceNotes: e.target.value })}
            rows={2}
            className={fieldInput}
          />
        </div>

        {error && <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">{error}</div>}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className={btnSecondary}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className={btnConfirm}
          >
            {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
