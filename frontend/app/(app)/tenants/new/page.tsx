'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { IneCamera, type IneCaptureResult } from '@/components/IneCamera';
import { useAuth } from '@/hooks/useAuth';
import { tenantsApi, TenantInput } from '@/lib/api';
import { parseIneData, type ParsedIneResult } from '@/lib/ineParser';
import { runIneOcr } from '@/lib/ineOcr';
import type { Roi } from '@/lib/imagePreprocess';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  CameraIcon,
  RotateCardIcon,
  AlertTriangleIcon,
  InfoIcon,
} from '@/components/icons';

// El flujo es un wizard de pantallas dedicadas, no un formulario con pasos: cada
// captura tiene su pantalla de indicaciones antes y su pantalla de confirmación
// después. Así el usuario nunca está adivinando qué foto le toca ni si salió bien.
type Stage =
  | 'intro-front'
  | 'camera-front'
  | 'confirm-front'
  | 'intro-back'
  | 'camera-back'
  | 'confirm-back'
  | 'processing'
  | 'review';

interface Capture {
  blob: Blob;
  roi?: Roi;
  rotateDeg: 0 | 90 | -90 | 180;
  previewUrl: string;
}

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

const toCapture = (result: IneCaptureResult): Capture => ({
  blob: result.blob,
  roi: result.roi,
  rotateDeg: result.rotateDeg,
  previewUrl: URL.createObjectURL(result.blob),
});

/** Una foto de galería ya viene en su orientación natural: sin marco no hay ROI ni giro. */
const fileToCapture = (file: File): Capture => ({
  blob: file,
  roi: undefined,
  rotateDeg: 0,
  previewUrl: URL.createObjectURL(file),
});

export default function NewTenantWizardPage() {
  const { token } = useAuth();
  const router = useRouter();

  const [stage, setStage] = useState<Stage>('intro-front');
  const [front, setFront] = useState<Capture | null>(null);
  const [back, setBack] = useState<Capture | null>(null);

  const [ocrMessage, setOcrMessage] = useState('');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [parsed, setParsed] = useState<ParsedIneResult | null>(null);

  const [form, setForm] = useState<TenantInput>(emptyForm);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Las URLs de preview se liberan al desmontar; si no, cada retoma deja una viva.
  const previewUrls = useRef<string[]>([]);
  useEffect(() => {
    const urls = previewUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const trackPreview = (capture: Capture) => {
    previewUrls.current.push(capture.previewUrl);
    return capture;
  };

  const runOcr = useCallback(async (frontCapture: Capture, backCapture: Capture | null) => {
    setStage('processing');
    setOcrProgress(0);
    setOcrMessage('Preparando...');

    try {
      const result = await runIneOcr(
        { blob: frontCapture.blob, roi: frontCapture.roi, rotateDeg: frontCapture.rotateDeg },
        backCapture
          ? { blob: backCapture.blob, roi: backCapture.roi, rotateDeg: backCapture.rotateDeg }
          : null,
        (message, progress) => {
          setOcrMessage(message);
          setOcrProgress(progress);
        },
      );

      const data = parseIneData(result);
      setParsed(data);
      setForm((previous) => ({
        ...previous,
        fullName: data.fullName ?? previous.fullName,
        curp: data.curp ?? previous.curp,
        birthDate: data.birthDate ?? previous.birthDate,
        address: data.address ?? previous.address,
        idDocument: data.idDocument ?? previous.idDocument,
      }));
    } catch (ocrError) {
      console.error('OCR del INE falló:', ocrError);
      setParsed({ confidence: 'low', sources: {}, mrzVerified: false });
    } finally {
      setOcrProgress(1);
      setStage('review');
    }
  }, []);

  const skipToManual = () => {
    setParsed(null);
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
      const frontFile = front ? new File([front.blob], 'ine-front.jpg', { type: 'image/jpeg' }) : null;
      const backFile = back ? new File([back.blob], 'ine-back.jpg', { type: 'image/jpeg' }) : null;
      const created = await tenantsApi.createWithIne(form, { front: frontFile, back: backFile }, token);
      router.push(`/tenants/${created.id}/profile`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Error al crear inquilino');
    } finally {
      setIsSaving(false);
    }
  };

  // Las pantallas de cámara se devuelven antes del contenedor con padding: ocupan
  // el viewport completo y no deben heredar el layout del wizard.
  if (stage === 'camera-front') {
    return (
      <IneCamera
        side="front"
        stepLabel="Paso 1 de 2"
        onCapture={(result) => {
          setFront(trackPreview(toCapture(result)));
          setStage('confirm-front');
        }}
        onPickFile={(file) => {
          setFront(trackPreview(fileToCapture(file)));
          setStage('confirm-front');
        }}
        onCancel={() => setStage('intro-front')}
      />
    );
  }

  if (stage === 'camera-back') {
    return (
      <IneCamera
        side="back"
        stepLabel="Paso 2 de 2"
        onCapture={(result) => {
          setBack(trackPreview(toCapture(result)));
          setStage('confirm-back');
        }}
        onPickFile={(file) => {
          setBack(trackPreview(fileToCapture(file)));
          setStage('confirm-back');
        }}
        onCancel={() => setStage('intro-back')}
      />
    );
  }

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className="mx-auto max-w-lg">
        {stage === 'intro-front' && (
          <IntroScreen
            step="Paso 1 de 2"
            title="Foto del frente"
            description="Del frente sacamos el nombre, la CURP, el domicilio y la clave de elector."
            onBack={() => router.push('/tenants')}
            onContinue={() => setStage('camera-front')}
            continueLabel="Abrir cámara"
            footer={
              <button onClick={skipToManual} className="text-sm text-muted underline hover:text-heading">
                Prefiero capturar los datos a mano
              </button>
            }
          />
        )}

        {stage === 'confirm-front' && front && (
          <ConfirmScreen
            step="Paso 1 de 2"
            title="¿Se lee bien el frente?"
            previewUrl={front.previewUrl}
            onRetake={() => setStage('camera-front')}
            onContinue={() => setStage('intro-back')}
            onBack={() => setStage('intro-front')}
          />
        )}

        {stage === 'intro-back' && (
          <IntroScreen
            step="Paso 2 de 2"
            title="Foto del reverso"
            description="El reverso trae la zona MRZ: esas líneas con «<<<» de abajo. Es la parte más confiable de toda la credencial, así que procura que salga completa y nítida."
            onBack={() => setStage('confirm-front')}
            onContinue={() => setStage('camera-back')}
            continueLabel="Abrir cámara"
            footer={
              <button
                onClick={() => front && runOcr(front, null)}
                className="text-sm text-muted underline hover:text-heading"
              >
                Continuar sólo con el frente
              </button>
            }
          />
        )}

        {stage === 'confirm-back' && back && (
          <ConfirmScreen
            step="Paso 2 de 2"
            title="¿Se leen las líneas del MRZ?"
            previewUrl={back.previewUrl}
            onRetake={() => setStage('camera-back')}
            onContinue={() => front && runOcr(front, back)}
            continueLabel="Leer credencial"
            onBack={() => setStage('intro-back')}
          />
        )}

        {stage === 'processing' && (
          <div className="py-24 text-center">
            <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            <p className="font-medium text-heading">{ocrMessage || 'Procesando...'}</p>
            <div className="mx-auto mt-5 h-1.5 w-48 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${Math.round(ocrProgress * 100)}%` }}
              />
            </div>
            <p className="mt-4 px-8 text-xs leading-relaxed text-muted">
              La primera vez se descarga el modelo de lectura (~10 MB). Después es más rápido.
            </p>
          </div>
        )}

        {stage === 'review' && (
          <ReviewScreen
            form={form}
            setForm={setForm}
            parsed={parsed}
            front={front}
            back={back}
            error={error}
            isSaving={isSaving}
            onSubmit={handleSubmit}
            onRetake={() => setStage('intro-front')}
            onCancel={() => router.push('/tenants')}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

// --- Pantallas del wizard ---------------------------------------------------

function StepHeader({ step, onBack }: { step: string; onBack: () => void }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <button
        onClick={onBack}
        className="-ml-1 flex items-center gap-1.5 text-sm text-muted hover:text-heading"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Atrás
      </button>
      <span className="text-xs font-medium text-muted">{step}</span>
    </div>
  );
}

function IntroScreen({
  step,
  title,
  description,
  onBack,
  onContinue,
  continueLabel,
  footer,
}: {
  step: string;
  title: string;
  description: string;
  onBack: () => void;
  onContinue: () => void;
  continueLabel: string;
  footer?: React.ReactNode;
}) {
  return (
    <div>
      <StepHeader step={step} onBack={onBack} />

      <div className="rounded-2xl bg-surface p-6 text-center">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <RotateCardIcon className="h-10 w-10 text-primary" />
        </div>

        <h1 className="mb-2 text-xl font-bold text-heading">{title}</h1>
        <p className="mb-6 text-sm leading-relaxed text-muted">{description}</p>

        <ul className="mb-6 space-y-2.5 text-left">
          {[
            'Gira la credencial: va de pie dentro del marco.',
            'Llena el marco por completo, sin dejar borde.',
            'Luz pareja, sin reflejos ni sombras encima.',
          ].map((tip) => (
            <li key={tip} className="flex gap-2.5 text-sm text-muted">
              <CheckCircleIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              {tip}
            </li>
          ))}
        </ul>

        <button
          onClick={onContinue}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-medium text-white hover:bg-primary-pressed"
        >
          <CameraIcon className="h-4 w-4" />
          {continueLabel}
        </button>
      </div>

      {footer && <div className="mt-5 text-center">{footer}</div>}
    </div>
  );
}

function ConfirmScreen({
  step,
  title,
  previewUrl,
  onRetake,
  onContinue,
  continueLabel = 'Continuar',
  onBack,
}: {
  step: string;
  title: string;
  previewUrl: string;
  onRetake: () => void;
  onContinue: () => void;
  continueLabel?: string;
  onBack: () => void;
}) {
  return (
    <div>
      <StepHeader step={step} onBack={onBack} />

      <h1 className="mb-1 text-xl font-bold text-heading">{title}</h1>
      <p className="mb-5 text-sm text-muted">
        Si el texto se ve borroso o cortado, vuelve a tomarla: de esta foto sale todo lo demás.
      </p>

      <div className="mb-5 overflow-hidden rounded-2xl bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt="Foto capturada del INE" className="mx-auto max-h-[52vh] w-auto" />
      </div>

      <div className="flex gap-3">
        <button
          onClick={onRetake}
          className="flex-1 rounded-xl bg-surface py-3.5 text-sm font-medium text-muted hover:bg-canvas"
        >
          Volver a tomar
        </button>
        <button
          onClick={onContinue}
          className="flex-1 rounded-xl bg-primary py-3.5 text-sm font-medium text-white hover:bg-primary-pressed"
        >
          {continueLabel}
        </button>
      </div>
    </div>
  );
}

/** Aviso de qué tan bien salió la lectura, para que el admin sepa cuánto revisar. */
function ConfidenceBanner({ parsed }: { parsed: ParsedIneResult | null }) {
  if (!parsed) {
    return (
      <div className="mb-4 flex gap-2.5 rounded-xl border border-black/10 bg-canvas p-3 text-sm text-muted dark:border-white/10">
        <InfoIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
        Captura manual: llena los datos del inquilino a mano.
      </div>
    );
  }

  if (parsed.confidence === 'high') {
    return (
      <div className="mb-4 flex gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/10 dark:text-emerald-400">
        <CheckCircleIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <span>
          Credencial leída correctamente
          {parsed.mrzVerified && ' (MRZ verificado)'}. Sólo falta el teléfono.
        </span>
      </div>
    );
  }

  if (parsed.confidence === 'medium') {
    return (
      <div className="mb-4 flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/10 dark:text-amber-400">
        <AlertTriangleIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
        Se leyeron algunos datos. Revisa cada campo contra la credencial antes de guardar.
      </div>
    );
  }

  return (
    <div className="mb-4 flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/10 dark:text-amber-400">
      <AlertTriangleIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
      No se pudo leer la credencial. Puedes volver a tomar las fotos o capturar los datos a mano.
    </div>
  );
}

/** Marca los campos que vienen de una fuente autovalidante (MRZ o CURP). */
function SourceBadge({ source }: { source?: 'mrz' | 'curp' | 'ocr' }) {
  if (source !== 'mrz' && source !== 'curp') return null;
  return (
    <span className="ml-2 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
      {source === 'mrz' ? 'MRZ' : 'CURP'}
    </span>
  );
}

function ReviewScreen({
  form,
  setForm,
  parsed,
  front,
  back,
  error,
  isSaving,
  onSubmit,
  onRetake,
  onCancel,
}: {
  form: TenantInput;
  setForm: (form: TenantInput) => void;
  parsed: ParsedIneResult | null;
  front: Capture | null;
  back: Capture | null;
  error: string;
  isSaving: boolean;
  onSubmit: () => void;
  onRetake: () => void;
  onCancel: () => void;
}) {
  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-heading">Revisa los datos</h1>
      <p className="mb-5 text-sm text-muted">
        {front ? 'El teléfono no viene en el INE, agrégalo a mano.' : 'Captura los datos del inquilino.'}
      </p>

      <ConfidenceBanner parsed={parsed} />

      {(front || back) && (
        <div className="mb-5 flex items-end gap-3 rounded-xl bg-canvas p-3">
          {front && (
            <figure className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={front.previewUrl} alt="Frente del INE" className="h-20 w-auto rounded-lg" />
              <figcaption className="mt-1 text-[11px] text-muted">Frente</figcaption>
            </figure>
          )}
          {back && (
            <figure className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={back.previewUrl} alt="Reverso del INE" className="h-20 w-auto rounded-lg" />
              <figcaption className="mt-1 text-[11px] text-muted">Reverso</figcaption>
            </figure>
          )}
          <button onClick={onRetake} className="ml-auto pb-1 text-xs text-primary underline">
            Volver a escanear
          </button>
        </div>
      )}

      <div className="space-y-4 rounded-2xl bg-surface p-5 shadow-sm">
        <div>
          <label className={labelClass}>
            Nombre completo
            <SourceBadge source={parsed?.sources.fullName} />
          </label>
          <input
            type="text"
            value={form.fullName}
            onChange={(event) => setForm({ ...form, fullName: event.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Teléfono (obligatorio)</label>
          <input
            type="tel"
            inputMode="numeric"
            value={form.phone ?? ''}
            onChange={(event) =>
              setForm({ ...form, phone: event.target.value.replace(/\D/g, '').slice(0, 10) })
            }
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
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>
              CURP
              <SourceBadge source={parsed?.sources.curp} />
            </label>
            <input
              type="text"
              value={form.curp ?? ''}
              onChange={(event) => setForm({ ...form, curp: event.target.value.toUpperCase() })}
              maxLength={18}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Nacimiento
              <SourceBadge source={parsed?.sources.birthDate} />
            </label>
            <input
              type="date"
              value={form.birthDate ?? ''}
              onChange={(event) => setForm({ ...form, birthDate: event.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Clave de elector</label>
          <input
            type="text"
            value={form.idDocument ?? ''}
            onChange={(event) => setForm({ ...form, idDocument: event.target.value.toUpperCase() })}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Domicilio</label>
          <textarea
            value={form.address ?? ''}
            onChange={(event) => setForm({ ...form, address: event.target.value })}
            rows={2}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div>
          <label className={labelClass}>Notas</label>
          <textarea
            value={form.notes ?? ''}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
            rows={2}
            placeholder="Notas internas (no visibles para el inquilino)..."
            className={`${inputClass} resize-none`}
          />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 rounded-xl bg-surface py-3.5 text-sm font-medium text-muted hover:bg-canvas"
        >
          Cancelar
        </button>
        <button
          onClick={onSubmit}
          disabled={isSaving}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-medium text-white hover:bg-primary-pressed disabled:opacity-50"
        >
          {isSaving ? (
            'Guardando...'
          ) : (
            <>
              <CheckCircleIcon className="h-4 w-4" /> Guardar inquilino
            </>
          )}
        </button>
      </div>
    </div>
  );
}
