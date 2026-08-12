'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { IneCamera } from '@/components/IneCamera';
import { useAuth } from '@/hooks/useAuth';
import { tenantsApi, TenantInput } from '@/lib/api';
import { parseIneText } from '@/lib/ineParser';
import { ArrowLeftIcon, CheckCircleIcon } from '@/components/icons';

type Stage = 'camera-front' | 'camera-back' | 'processing' | 'review';

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

const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;

const inputClass =
  'w-full px-3 py-2.5 border border-black/10 dark:border-white/10 bg-canvas text-heading rounded-xl focus:outline-none focus:ring-2 focus:ring-primary';
const labelClass = 'block text-sm font-medium text-heading mb-1.5';

export default function NewTenantWizardPage() {
  const { token } = useAuth();
  const router = useRouter();

  const [stage, setStage] = useState<Stage>('camera-front');
  const [frontBlob, setFrontBlob] = useState<Blob | null>(null);
  const [backBlob, setBackBlob] = useState<Blob | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState('');
  const [ocrWarning, setOcrWarning] = useState('');

  const [form, setForm] = useState<TenantInput>(emptyForm);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const runOcr = async (front: Blob, back: Blob | null) => {
    setStage('processing');
    setOcrWarning('');
    try {
      const { recognize } = await import('tesseract.js');
      setOcrStatus('Leyendo frente del INE...');
      const frontResult = await recognize(front, 'spa');
      let backText = '';
      if (back) {
        setOcrStatus('Leyendo reverso del INE...');
        const backResult = await recognize(back, 'spa');
        backText = backResult.data.text;
      }
      const parsed = parseIneText(frontResult.data.text, backText);
      setForm((prev) => ({
        ...prev,
        fullName: parsed.fullName ?? prev.fullName,
        curp: parsed.curp ?? prev.curp,
        birthDate: parsed.birthDate ?? prev.birthDate,
        address: parsed.address ?? prev.address,
        idDocument: parsed.idDocument ?? prev.idDocument,
      }));
      if (!parsed.curp && !parsed.fullName) {
        setOcrWarning('No se pudo leer el INE automáticamente. Completa los datos a mano.');
      }
    } catch {
      setOcrWarning('No se pudo leer el INE automáticamente. Completa los datos a mano.');
    } finally {
      setStage('review');
    }
  };

  const handleFrontCapture = (blob: Blob) => {
    setFrontBlob(blob);
    setFrontPreview(URL.createObjectURL(blob));
    setStage('camera-back');
  };

  const handleBackCapture = (blob: Blob) => {
    setBackBlob(blob);
    setBackPreview(URL.createObjectURL(blob));
    runOcr(frontBlob as Blob, blob);
  };

  const handleSkipManual = () => {
    setFrontBlob(null);
    setBackBlob(null);
    setFrontPreview(null);
    setBackPreview(null);
    setForm(emptyForm);
    setStage('review');
  };

  const validate = (): string | null => {
    if (!form.fullName || form.fullName.trim().length < 3) return 'El nombre completo es obligatorio.';
    if (!form.phone || !/^\d{10}$/.test(form.phone)) return 'El teléfono debe tener 10 dígitos.';
    if (form.curp && !CURP_REGEX.test(form.curp)) return 'La CURP capturada no es válida — corrígela o bórrala.';
    return null;
  };

  const handleSubmit = async () => {
    if (!token) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setIsSaving(true);
    try {
      // Convertir blobs a files con nombres apropiados
      const frontFile = frontBlob ? new File([frontBlob], 'ine-front.jpg', { type: 'image/jpeg' }) : null;
      const backFile = backBlob ? new File([backBlob], 'ine-back.jpg', { type: 'image/jpeg' }) : null;
      const created = await tenantsApi.createWithIne(form, { front: frontFile, back: backFile }, token);
      router.push(`/tenants/${created.id}/profile`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear inquilino');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (stage === 'camera-back') {
      setBackBlob(null);
      setBackPreview(null);
      setStage('camera-front');
    } else if (stage === 'camera-front') {
      router.push('/tenants');
    } else {
      router.push('/tenants');
    }
  };

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className="max-w-lg mx-auto">
        {stage !== 'processing' && (
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-muted hover:text-heading text-sm mb-4 -ml-1"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            {stage === 'camera-back' ? 'Frente del INE' : 'Inquilinos'}
          </button>
        )}

        {stage === 'camera-front' && (
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-heading mb-1">Frente del INE</h1>
            <p className="text-muted text-sm mb-4">
              Posiciona el frente de la credencial dentro del recuadro. La cámara está dentro de la app.
            </p>
            <IneCamera
              side="front"
              onCapture={handleFrontCapture}
              onCancel={handleSkipManual}
            />
            <div className="mt-4">
              <button onClick={handleSkipManual} className="text-muted text-sm underline hover:text-heading">
                Prefiero llenar los datos manualmente
              </button>
            </div>
          </div>
        )}

        {stage === 'camera-back' && (
          <div className="space-y-4">
            {frontPreview && (
              <div className="bg-surface rounded-2xl p-4 text-center">
                <p className="text-muted text-xs mb-2">Foto del frente capturada:</p>
                <img src={frontPreview} alt="Frente del INE" className="w-32 mx-auto rounded-lg shadow-sm" />
              </div>
            )}
            <h1 className="text-xl font-bold text-heading mb-1">Reverso del INE</h1>
            <p className="text-muted text-sm mb-4">
              Ahora posiciona el reverso de la credencial dentro del recuadro.
            </p>
            <IneCamera
              side="back"
              onCapture={handleBackCapture}
              onCancel={() => setStage('camera-front')}
            />
          </div>
        )}

        {stage === 'processing' && (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-6" />
            <p className="text-heading font-medium">{ocrStatus || 'Procesando...'}</p>
            <p className="text-muted text-sm mt-1">Esto puede tardar unos segundos.</p>
          </div>
        )}

        {stage === 'review' && (
          <div>
            <h1 className="text-xl font-bold text-heading mb-1">Revisa los datos</h1>
            <p className="text-muted text-sm mb-5">
              {frontBlob
                ? 'Corrige lo que haga falta. El teléfono no viene en el INE, así que agrégalo a mano.'
                : 'Captura los datos del inquilino manualmente.'}
            </p>

            {(frontPreview || backPreview) && (
              <div className="flex gap-3 mb-5 p-4 bg-canvas rounded-xl">
                {frontPreview && (
                  <div className="text-center">
                    <img src={frontPreview} alt="Frente del INE" className="w-24 rounded-lg shadow-sm" />
                    <p className="text-muted text-xs mt-1">Frente</p>
                  </div>
                )}
                {backPreview && (
                  <div className="text-center">
                    <img src={backPreview} alt="Reverso del INE" className="w-24 rounded-lg shadow-sm" />
                    <p className="text-muted text-xs mt-1">Reverso</p>
                  </div>
                )}
              </div>
            )}

            {ocrWarning && (
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-400 mb-4">
                {ocrWarning}
              </div>
            )}

            <div className="bg-surface rounded-2xl shadow-sm p-5 space-y-4">
              <div>
                <label className={labelClass}>Nombre completo</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Teléfono (obligatorio, captúralo a mano)</label>
                <input
                  type="tel"
                  value={form.phone ?? ''}
                  onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  maxLength={10}
                  autoFocus
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={form.email ?? ''}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>CURP</label>
                  <input
                    type="text"
                    value={form.curp ?? ''}
                    onChange={(e) => setForm({ ...form, curp: e.target.value.toUpperCase() })}
                    maxLength={18}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Fecha de nacimiento</label>
                  <input
                    type="date"
                    value={form.birthDate ?? ''}
                    onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Clave de elector</label>
                <input
                  type="text"
                  value={form.idDocument ?? ''}
                  onChange={(e) => setForm({ ...form, idDocument: e.target.value.toUpperCase() })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Domicilio</label>
                <textarea
                  value={form.address ?? ''}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div>
                <label className={labelClass}>Notas</label>
                <textarea
                  value={form.notes ?? ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Notas internas (no visibles para el inquilino)..."
                  className={`${inputClass} resize-none`}
                />
              </div>

              {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => router.push('/tenants')}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-muted bg-surface hover:bg-canvas"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSaving}
                className="flex-1 bg-primary hover:bg-primary-pressed text-white py-3 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  'Guardando...'
                ) : (
                  <>
                    <CheckCircleIcon className="w-4 h-4" /> Guardar inquilino
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
