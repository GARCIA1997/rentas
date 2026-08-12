'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraIcon, ArrowLeftIcon, BoltIcon } from './icons';
import type { Roi } from '@/lib/imagePreprocess';
import { computeFrameRect, frameRectToRoi, type Rect } from '@/lib/cardFrame';

export interface IneCaptureResult {
  /** Frame completo, sin recortar: es la copia que se archiva como respaldo. */
  blob: Blob;
  /** Recorte del marco guía, normalizado al frame de video. Lo consume el OCR. */
  roi: Roi;
  /** El marco es vertical y el texto del INE horizontal: hay que deshacer el giro. */
  rotateDeg: -90;
}

interface IneCameraProps {
  side: 'front' | 'back';
  stepLabel: string;
  onCapture: (result: IneCaptureResult) => void;
  onCancel: () => void;
  /** Salida de emergencia si la cámara del navegador no cooperó. */
  onPickFile?: (file: File) => void;
}

// `torch` y `focusMode` son extensiones de la spec de media capture que todavía no
// están en lib.dom.d.ts. Se declaran aquí en vez de castear a `any` para que el
// compilador siga cuidando el resto del objeto de constraints.
interface ExtendedConstraintSet extends MediaTrackConstraintSet {
  torch?: boolean;
  focusMode?: string;
}

type ExtendedConstraints = MediaTrackConstraints & { advanced?: ExtendedConstraintSet[] };

interface ExtendedCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
}

export function IneCamera({ side, stepLabel, onCapture, onCancel, onPickFile }: IneCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState('');
  const [frame, setFrame] = useState<Rect | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            // Se pide resolución alta porque el texto de la CURP mide ~2 mm: con
            // 720p la altura de esos caracteres queda por debajo de lo que el
            // motor puede resolver, por buena que sea la foto.
            width: { ideal: 1920 },
            height: { ideal: 2560 },
            // Y se pide vertical explícitamente: si el navegador entrega el frame
            // acostado mientras la página está en retrato, `object-fit: cover`
            // recorta los lados y el marco vertical se queda con ~40% menos de
            // píxeles sobre la credencial. Los navegadores que respetan este
            // constraint entregan el stream ya en la orientación correcta.
            aspectRatio: { ideal: 9 / 16 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        const [track] = stream.getVideoTracks();
        // El enfoque continuo y la linterna no están en todos los navegadores;
        // se intentan y si no existen, se sigue sin ellos.
        try {
          await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] } as ExtendedConstraints);
        } catch {
          /* no soportado */
        }
        const capabilities = track.getCapabilities?.() as ExtendedCapabilities | undefined;
        setTorchAvailable(Boolean(capabilities?.torch));

        setIsStreaming(true);
      } catch {
        setError('No se pudo abrir la cámara. Revisa el permiso o usa una foto de tu galería.');
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  // El marco se recalcula ante cualquier cambio de tamaño (rotación, barra del navegador).
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const update = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width > 0 && height > 0) setFrame(computeFrameRect(width, height));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] } as ExtendedConstraints);
      setTorchOn((previous) => !previous);
    } catch {
      setTorchAvailable(false);
    }
  }, [torchOn]);

  const handleCapture = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!video || !canvas || !container || !frame || isCapturing) return;

    setIsCapturing(true);
    try {
      const videoW = video.videoWidth;
      const videoH = video.videoHeight;
      if (!videoW || !videoH) return;

      canvas.width = videoW;
      canvas.height = videoH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, videoW, videoH);

      const { width: containerW, height: containerH } = container.getBoundingClientRect();
      const roi = frameRectToRoi(frame, containerW, containerH, videoW, videoH);

      const blob = await new Promise<Blob | null>((resolve) =>
        // Calidad alta: cada artefacto de compresión sobre un carácter de 2 mm es
        // un carácter que el OCR ya no va a acertar.
        canvas.toBlob((result) => resolve(result), 'image/jpeg', 0.95),
      );
      if (blob) onCapture({ blob, roi, rotateDeg: -90 });
    } finally {
      setIsCapturing(false);
    }
  }, [frame, isCapturing, onCapture]);

  const title = side === 'front' ? 'Frente del INE' : 'Reverso del INE';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <header className="flex flex-shrink-0 items-center justify-between px-2 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          onClick={onCancel}
          className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm text-white/90 active:bg-white/10"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          Atrás
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-[11px] text-white/50">{stepLabel}</p>
        </div>
        {torchAvailable ? (
          <button
            onClick={toggleTorch}
            aria-pressed={torchOn}
            aria-label="Linterna"
            className={`rounded-xl p-2.5 active:bg-white/10 ${torchOn ? 'text-amber-300' : 'text-white/70'}`}
          >
            <BoltIcon className="h-5 w-5" />
          </button>
        ) : (
          <span className="w-11" />
        )}
      </header>

      <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover"
        />

        {isStreaming && frame && (
          <div className="pointer-events-none absolute inset-0">
            {/* El box-shadow gigante oscurece todo lo que queda fuera del marco
                sin tener que calcular cuatro rectángulos de máscara. */}
            <div
              className="absolute rounded-3xl"
              style={{
                left: frame.left,
                top: frame.top,
                width: frame.width,
                height: frame.height,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
              }}
            />
            <div
              className="absolute rounded-3xl border-2 border-white/30"
              style={{ left: frame.left, top: frame.top, width: frame.width, height: frame.height }}
            >
              <span className="absolute -left-px -top-px h-9 w-9 rounded-tl-3xl border-l-4 border-t-4 border-primary" />
              <span className="absolute -right-px -top-px h-9 w-9 rounded-tr-3xl border-r-4 border-t-4 border-primary" />
              <span className="absolute -bottom-px -left-px h-9 w-9 rounded-bl-3xl border-b-4 border-l-4 border-primary" />
              <span className="absolute -bottom-px -right-px h-9 w-9 rounded-br-3xl border-b-4 border-r-4 border-primary" />

              {/* Pista de orientación: el texto de la credencial va de pie dentro
                  del marco, así que se rotula girado igual que hay que girarla. */}
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="rotate-90 text-[11px] font-medium tracking-[0.3em] text-white/25">
                  {side === 'front' ? 'FRENTE' : 'REVERSO'}
                </span>
              </span>
            </div>
          </div>
        )}

        {!isStreaming && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
            <p className="text-sm text-white/60">Abriendo cámara...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15">
              <CameraIcon className="h-7 w-7 text-red-400" />
            </div>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      <footer className="flex-shrink-0 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
        <p className="mb-4 text-center text-xs leading-relaxed text-white/60">
          Gira la credencial y llena el marco. Busca luz pareja y evita reflejos.
        </p>

        <div className="flex items-center justify-between">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-20 text-left text-xs text-white/50 active:text-white/80"
          >
            Galería
          </button>

          <button
            onClick={handleCapture}
            disabled={!isStreaming || isCapturing}
            aria-label="Capturar"
            className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white/15 ring-4 ring-white/30 transition active:scale-95 disabled:opacity-40"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white">
              <CameraIcon className="h-6 w-6 text-black" />
            </span>
          </button>

          <button onClick={onCancel} className="w-20 text-right text-xs text-white/50 active:text-white/80">
            Cancelar
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Sin marco de referencia no hay ROI: se procesa la imagen completa.
            if (file && onPickFile) onPickFile(file);
          }}
        />
      </footer>
    </div>
  );
}
