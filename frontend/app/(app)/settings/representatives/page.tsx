'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Modal } from '@/components/Modal';
import { useAuth } from '@/hooks/useAuth';
import { representativesApi, Representative, RepresentativeInput } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';
import { ArrowLeftIcon } from '@/components/icons';

const emptyForm: RepresentativeInput = {
  fullName: '',
  position: '',
  idDocument: '',
  phone: '',
  email: '',
  signatureImageUrl: '',
  isActive: true,
};

export default function RepresentativesPage() {
  const { token } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RepresentativeInput>(emptyForm);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await representativesApi.list(token);
      setRepresentatives(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar representantes');
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

  const openEditModal = (representative: Representative) => {
    setEditingId(representative.id);
    setForm({
      fullName: representative.fullName,
      position: representative.position ?? '',
      idDocument: representative.idDocument ?? '',
      phone: representative.phone ?? '',
      email: representative.email ?? '',
      signatureImageUrl: representative.signatureImageUrl ?? '',
      isActive: representative.isActive,
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
        await representativesApi.update(editingId, form, token);
      } else {
        await representativesApi.create(form, token);
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
    const confirmed = await confirm({
      title: 'Eliminar representante',
      message: '¿Eliminar este representante? Si tiene contratos asociados, considera desactivarlo en su lugar.',
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await representativesApi.remove(id, token);
      await loadData();
      showToast('Representante eliminado.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al eliminar', 'error');
    }
  };

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <button
        onClick={() => router.push('/settings')}
        className="flex items-center gap-1.5 text-muted hover:text-heading text-sm mb-4 -ml-1"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Configuración
      </button>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold text-heading">Representantes</h1>
        <button
          onClick={openCreateModal}
          className="bg-primary hover:bg-primary-pressed text-white px-4 py-2.5 rounded-xl text-sm font-medium self-start sm:self-auto active:opacity-80"
        >
          + Nuevo representante
        </button>
      </div>
      <p className="text-sm text-muted mb-6">
        Personas que firman los contratos a título personal (no como empresa). Se eligen al generar cada contrato.
      </p>

      {isLoading ? (
        <p className="text-muted">Cargando...</p>
      ) : representatives.length === 0 ? (
        <div className="bg-surface rounded-2xl p-8 text-center text-muted">No hay representantes registrados.</div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="sm:hidden space-y-3">
            {representatives.map((rep) => (
              <div key={rep.id} className="bg-surface rounded-2xl shadow-sm p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-heading font-semibold truncate">{rep.fullName}</p>
                    <p className="text-muted text-sm truncate">{rep.position ?? 'Sin cargo'}</p>
                    <p className="text-xs text-muted mt-1 truncate">{rep.phone ?? rep.email ?? 'Sin contacto'}</p>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                      rep.isActive
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {rep.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="flex gap-4 mt-3 pt-3 border-t border-black/5 dark:border-white/10">
                  <button onClick={() => openEditModal(rep)} className="text-primary text-sm font-medium">
                    Editar
                  </button>
                  <button onClick={() => handleDelete(rep.id)} className="text-red-600 text-sm font-medium">
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block bg-surface rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-canvas text-muted text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Cargo</th>
                  <th className="px-4 py-3 font-medium">Identificación</th>
                  <th className="px-4 py-3 font-medium">Contacto</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/10">
                {representatives.map((rep) => (
                  <tr key={rep.id}>
                    <td className="px-4 py-3 text-heading font-medium">{rep.fullName}</td>
                    <td className="px-4 py-3 text-muted">{rep.position ?? '—'}</td>
                    <td className="px-4 py-3 text-muted">{rep.idDocument ?? '—'}</td>
                    <td className="px-4 py-3 text-muted">{rep.phone ?? rep.email ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          rep.isActive
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {rep.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-3">
                      <button onClick={() => openEditModal(rep)} className="text-primary hover:underline">
                        Editar
                      </button>
                      <button onClick={() => handleDelete(rep.id)} className="text-red-600 hover:underline">
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
          title={editingId ? 'Editar representante' : 'Nuevo representante'}
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

            <div>
              <label className="block text-sm font-medium text-heading mb-1">Cargo</label>
              <input
                type="text"
                placeholder="Ej: Administrador"
                value={form.position ?? ''}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                className="w-full px-3 py-2 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
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

            <label className="flex items-center gap-2 text-sm text-heading">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded"
              />
              Activo (disponible para elegir en nuevos contratos)
            </label>

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
