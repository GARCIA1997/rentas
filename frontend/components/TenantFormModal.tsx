'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Modal } from './Modal';
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
          <label className="block text-sm font-medium text-heading mb-1">Clave de elector</label>
          <input
            type="text"
            value={form.idDocument ?? ''}
            onChange={(e) => setForm({ ...form, idDocument: e.target.value.toUpperCase() })}
            className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-heading mb-1">CURP</label>
            <input
              type="text"
              value={form.curp ?? ''}
              onChange={(e) => setForm({ ...form, curp: e.target.value.toUpperCase() })}
              maxLength={18}
              className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-heading mb-1">Fecha de nacimiento</label>
            <input
              type="date"
              value={form.birthDate ?? ''}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
              className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-heading mb-1">Domicilio</label>
          <textarea
            value={form.address ?? ''}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
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

        <div>
          <label className="block text-sm font-medium text-heading mb-1">Notas</label>
          <textarea
            value={form.notes ?? ''}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            placeholder="Notas internas sobre este inquilino (no visibles para él)..."
            className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
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
