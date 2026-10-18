'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Modal, fieldLabel, fieldInput, btnSecondary, btnConfirm } from './Modal';
import { useAuth } from '@/hooks/useAuth';
import { tenantsApi, Tenant, TenantInput } from '@/lib/api';

const emptyForm: TenantInput = {
  fullName: '',
  email: '',
  phone: '',
  idDocument: '',
  status: 'ACTIVE',
  notes: '',
  address: '',
  curp: '',
  birthDate: '',
};

export function TenantFormModal({
  isOpen,
  onClose,
  tenant,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  tenant?: Tenant | null;
  onSaved: () => void;
}) {
  const { token } = useAuth();
  const [form, setForm] = useState<TenantInput>(emptyForm);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setForm(
      tenant
        ? {
            fullName: tenant.fullName,
            email: tenant.email ?? '',
            phone: tenant.phone ?? '',
            idDocument: tenant.idDocument ?? '',
            status: tenant.status,
            notes: tenant.notes ?? '',
            address: tenant.address ?? '',
            curp: tenant.curp ?? '',
            birthDate: tenant.birthDate ? tenant.birthDate.slice(0, 10) : '',
          }
        : emptyForm
    );
  }, [isOpen, tenant]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError('');
    setIsSaving(true);
    try {
      if (tenant) {
        await tenantsApi.update(tenant.id, form, token);
      } else {
        await tenantsApi.create(form, token);
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
    <Modal isOpen={isOpen} onClose={onClose} title={tenant ? 'Editar inquilino' : 'Nuevo inquilino'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={fieldLabel}>Nombre completo</label>
          <input
            type="text"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
            className={fieldInput}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={fieldLabel}>Teléfono</label>
            <input
              type="tel"
              value={form.phone ?? ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              maxLength={10}
              className={fieldInput}
            />
          </div>
          <div>
            <label className={fieldLabel}>Email</label>
            <input
              type="email"
              value={form.email ?? ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={fieldInput}
            />
          </div>
        </div>

        <div>
          <label className={fieldLabel}>Clave de elector</label>
          <input
            type="text"
            value={form.idDocument ?? ''}
            onChange={(e) => setForm({ ...form, idDocument: e.target.value.toUpperCase() })}
            className={fieldInput}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={fieldLabel}>CURP</label>
            <input
              type="text"
              value={form.curp ?? ''}
              onChange={(e) => setForm({ ...form, curp: e.target.value.toUpperCase() })}
              maxLength={18}
              className={fieldInput}
            />
          </div>
          <div>
            <label className={fieldLabel}>Fecha de nacimiento</label>
            <input
              type="date"
              value={form.birthDate ?? ''}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
              className={fieldInput}
            />
          </div>
        </div>

        <div>
          <label className={fieldLabel}>Domicilio</label>
          <textarea
            value={form.address ?? ''}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            rows={2}
            className={`${fieldInput} resize-none`}
          />
        </div>

        <div>
          <label className={fieldLabel}>Estado</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as TenantInput['status'] })}
            className={fieldInput}
          >
            <option value="ACTIVE">Activo</option>
            <option value="EVICTED">Desalojado</option>
            <option value="MOVED_OUT">Mudanza</option>
          </select>
        </div>

        <div>
          <label className={fieldLabel}>Notas</label>
          <textarea
            value={form.notes ?? ''}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            placeholder="Notas internas sobre este inquilino (no visibles para él)..."
            className={`${fieldInput} resize-none`}
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
