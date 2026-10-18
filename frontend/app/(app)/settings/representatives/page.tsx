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
        className="flex items-center gap-1.5 text-[#586270] hover:text-[#173A5F] text-sm mb-4 -ml-1"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Configuración
      </button>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold text-[#173A5F]">Representantes</h1>
        <button
          onClick={openCreateModal}
          className="bg-[#2D9E6B] hover:bg-[#2D9E6B]-pressed text-white px-4 py-2.5 rounded-lg text-sm font-medium self-start sm:self-auto active:opacity-80"
        >
          + Nuevo representante
        </button>
      </div>
      <p className="text-sm text-[#586270] mb-6">
        Personas que firman los contratos a título personal (no como empresa). Se eligen al generar cada contrato.
      </p>

      {isLoading ? (
        <p className="text-[#586270]">Cargando...</p>
      ) : representatives.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center text-[#586270]">No hay representantes registrados.</div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="sm:hidden space-y-3">
            {representatives.map((rep) => (
              <div key={rep.id} className="bg-white rounded-lg border border-[#A7B0BB]/30 shadow-sm p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[#173A5F] font-semibold truncate">{rep.fullName}</p>
                    <p className="text-[#586270] text-sm truncate">{rep.position ?? 'Sin cargo'}</p>
                    <p className="text-xs text-[#586270] mt-1 truncate">{rep.phone ?? rep.email ?? 'Sin contacto'}</p>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                      rep.isActive
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {rep.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="flex gap-4 mt-3 pt-3 border-t border-[#A7B0BB]/30">
                  <button onClick={() => openEditModal(rep)} className="text-[#2D9E6B] text-sm font-medium">
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
          <div className="hidden sm:block bg-white rounded-lg border border-[#A7B0BB]/30 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F1E8] text-[#586270] text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Cargo</th>
                  <th className="px-4 py-3 font-medium">Identificación</th>
                  <th className="px-4 py-3 font-medium">Contacto</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {representatives.map((rep) => (
                  <tr key={rep.id}>
                    <td className="px-4 py-3 text-[#173A5F] font-medium">{rep.fullName}</td>
                    <td className="px-4 py-3 text-[#586270]">{rep.position ?? '—'}</td>
                    <td className="px-4 py-3 text-[#586270]">{rep.idDocument ?? '—'}</td>
                    <td className="px-4 py-3 text-[#586270]">{rep.phone ?? rep.email ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          rep.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {rep.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-3">
                      <button onClick={() => openEditModal(rep)} className="text-[#2D9E6B] hover:underline">
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
              <label className="block text-xs font-bold text-[#173A5F] mb-1.5">Nombre completo</label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
                className="w-full text-sm text-[#173A5F] placeholder-[#A7B0BB] bg-white border border-[#A7B0BB]/40 rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#173A5F] focus:ring-1 focus:ring-[#173A5F] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#173A5F] mb-1.5">Cargo</label>
              <input
                type="text"
                placeholder="Ej: Administrador"
                value={form.position ?? ''}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                className="w-full text-sm text-[#173A5F] placeholder-[#A7B0BB] bg-white border border-[#A7B0BB]/40 rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#173A5F] focus:ring-1 focus:ring-[#173A5F] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#173A5F] mb-1.5">Identificación (INE/CURP)</label>
              <input
                type="text"
                value={form.idDocument ?? ''}
                onChange={(e) => setForm({ ...form, idDocument: e.target.value })}
                className="w-full text-sm text-[#173A5F] placeholder-[#A7B0BB] bg-white border border-[#A7B0BB]/40 rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#173A5F] focus:ring-1 focus:ring-[#173A5F] transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#173A5F] mb-1.5">Teléfono</label>
                <input
                  type="tel"
                  value={form.phone ?? ''}
                  onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  maxLength={10}
                  className="w-full text-sm text-[#173A5F] placeholder-[#A7B0BB] bg-white border border-[#A7B0BB]/40 rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#173A5F] focus:ring-1 focus:ring-[#173A5F] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#173A5F] mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email ?? ''}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full text-sm text-[#173A5F] placeholder-[#A7B0BB] bg-white border border-[#A7B0BB]/40 rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#173A5F] focus:ring-1 focus:ring-[#173A5F] transition-all"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-[#173A5F]">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded"
              />
              Activo (disponible para elegir en nuevos contratos)
            </label>

            {error && <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">{error}</div>}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="py-2.5 px-4 rounded-lg border border-[#A7B0BB] bg-white text-sm font-bold text-[#173A5F] hover:bg-[#F5F1E8] transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="py-2.5 px-4 rounded-lg bg-[#2D9E6B] hover:bg-[#25855a] text-white font-bold text-sm shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
    </ProtectedRoute>
  );
}
