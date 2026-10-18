'use client';

import { useEffect, useState, FormEvent } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Modal, fieldLabel, fieldInput, btnSecondary, btnConfirm } from '@/components/Modal';
import { DetailHeader } from '@/components/StitchHeader';
import { useAuth } from '@/hooks/useAuth';
import { representativesApi, Representative, RepresentativeInput } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';
import { Fab } from '@/components/Fab';

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

  // Markup portado de Stitch: design/stitch/representatives.html
  return (
    <ProtectedRoute requiredRole="ADMIN">
      <DetailHeader title="Representantes legales" subtitle="Quiénes firman los contratos como arrendador" backHref="/settings" />

      <main className="max-w-md sm:max-w-3xl mx-auto w-full px-4 pt-4 pb-28 sm:pb-8 flex flex-col gap-4">
        <div className="bg-white border border-[#DDD9CF] rounded-lg p-3 flex items-start gap-3 shadow-sm">
          <div className="w-7 h-7 rounded-lg bg-[#173A5F]/10 flex items-center justify-center text-[#173A5F] shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[18px]">gavel</span>
          </div>
          <p className="text-[11px] leading-tight text-[#586270]">
            Firman los contratos a título personal (no como empresa). El representante elegido figura en el proemio, las declaraciones y la firma de cada contrato.
          </p>
        </div>

        {error && !isModalOpen && <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">{error}</div>}

        {isLoading ? (
          <p className="text-xs text-[#73777f]">Cargando...</p>
        ) : representatives.length === 0 ? (
          <div className="bg-white border border-[#DDD9CF] rounded-lg p-6 text-center">
            <span className="material-symbols-outlined text-[36px] text-[#73777f]">badge</span>
            <p className="text-xs text-[#586270] mt-1">No hay representantes registrados. Sin uno no se puede generar el PDF de un contrato.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {representatives.map((rep) => (
              <div key={rep.id} className="bg-white border border-[#DDD9CF] rounded-lg p-4 shadow-sm hover:border-[#173A5F]/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-10 h-10 rounded-lg text-white flex items-center justify-center font-bold text-sm shrink-0 ${rep.isActive ? 'bg-[#173A5F]' : 'bg-[#A7B0BB]'}`}>
                      {rep.fullName
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join('')
                        .toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <h2 className="text-sm font-bold text-[#173A5F] leading-tight truncate">{rep.fullName}</h2>
                      <span className="text-[11px] text-[#586270] font-medium truncate">{rep.position || 'Sin cargo'}</span>
                    </div>
                  </div>
                  {rep.isActive ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#2D9E6B]/15 text-[#2D9E6B] border border-[#2D9E6B]/30 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2D9E6B]"></span>
                      Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#A7B0BB]/20 text-[#586270] border border-[#A7B0BB]/30 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#A7B0BB]"></span>
                      Inactivo
                    </span>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-[#DDD9CF]/60 grid grid-cols-1 gap-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#73777f] font-medium">Identificación:</span>
                    <span className="font-semibold text-[#173A5F] tracking-wide select-all font-mono truncate">{rep.idDocument || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#73777f] font-medium">Teléfono:</span>
                    <span className="font-semibold text-[#173A5F] select-all">{rep.phone || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#73777f] font-medium">Correo:</span>
                    <span className="font-medium text-[#586270] truncate">{rep.email || '—'}</span>
                  </div>
                </div>
                <div className="mt-3.5 pt-2.5 border-t border-[#DDD9CF]/40 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(rep)}
                    aria-label={`Editar ${rep.fullName}`}
                    className="h-8 px-2.5 bg-white border border-[#DDD9CF] text-[#173A5F] hover:bg-[#F5F1E8] active:scale-95 transition-all rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    <span>Editar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(rep.id)}
                    aria-label={`Eliminar ${rep.fullName}`}
                    className="h-8 w-8 bg-white border border-[#C0392B]/40 text-[#C0392B] hover:bg-red-50 active:scale-95 transition-all rounded-lg flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Fab icon="person_add" label="Nuevo representante" onClick={openCreateModal} />

      <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingId ? 'Editar representante' : 'Nuevo representante'}
        >
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

            <div>
              <label className={fieldLabel}>Cargo</label>
              <input
                type="text"
                placeholder="Ej: Administrador"
                value={form.position ?? ''}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                className={fieldInput}
              />
            </div>

            <div>
              <label className={fieldLabel}>Identificación (INE/CURP)</label>
              <input
                type="text"
                value={form.idDocument ?? ''}
                onChange={(e) => setForm({ ...form, idDocument: e.target.value })}
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

            <label className="flex items-center gap-2 text-sm text-[#173A5F]">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="w-4 h-4 accent-[#2D9E6B]"
              />
              Activo (disponible para elegir en nuevos contratos)
            </label>

            {error && <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">{error}</div>}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setIsModalOpen(false)} className={btnSecondary}>
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
    </ProtectedRoute>
  );
}
