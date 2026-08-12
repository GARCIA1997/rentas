'use client';

import { useEffect, useRef, useState } from 'react';
import { CameraIcon, ArrowLeftIcon } from './icons';

interface IneCameraProps {
  side: 'front' | 'back';
  onCapture: (blob: Blob) => void;
  onCancel: () => void;
}

export function IneCamera({ side, onCapture, onCancel }: IneCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // cámara trasera en móviles
            width: { ideal: 1080 },
            height: { ideal: 1440 },
          },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          setIsStreaming(true);
        }
      } catch (err) {
        setError('No se pudo acceder a la cámara. Asegúrate de permitir el acceso.');
      }
    };

    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    // Copiar frame del video al canvas
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);

    // Convertir a blob y pasar al padre
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        onCapture(blob);
      }
    }, 'image/jpeg', 0.95);
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header compacto con botón atrás */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 text-white hover:text-primary text-sm"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Atrás
        </button>
        <p className="text-white font-medium text-sm">
          {side === 'front' ? 'Frente del INE' : 'Reverso del INE'}
        </p>
        <div className="w-12"></div>
      </div>

      {/* Video en fullscreen vertical */}
      <div className="flex-1 flex items-center justify-center overflow-hidden relative">
        {error ? (
          <div className="text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <CameraIcon className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-red-400 text-sm px-4">{error}</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {isStreaming && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Recuadro vertical para el INE */}
                <div className="relative w-3/4 h-2/3">
                  <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox="0 0 300 480"
                    preserveAspectRatio="none"
                  >
                    {/* Marco exterior */}
                    <rect
                      x="20"
                      y="40"
                      width="260"
                      height="400"
                      fill="none"
                      stroke="#0d9488"
                      strokeWidth="3"
                      rx="8"
                      opacity="0.8"
                    />
                    {/* Esquinas */}
                    <g stroke="#0d9488" strokeWidth="3" fill="none">
                      {/* Top left */}
                      <line x1="20" y1="40" x2="60" y2="40" />
                      <line x1="20" y1="40" x2="20" y2="80" />
                      {/* Top right */}
                      <line x1="280" y1="40" x2="240" y2="40" />
                      <line x1="280" y1="40" x2="280" y2="80" />
                      {/* Bottom left */}
                      <line x1="20" y1="440" x2="60" y2="440" />
                      <line x1="20" y1="440" x2="20" y2="400" />
                      {/* Bottom right */}
                      <line x1="280" y1="440" x2="240" y2="440" />
                      <line x1="280" y1="440" x2="280" y2="400" />
                    </g>
                  </svg>

                  {/* Overlay oscuro alrededor */}
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    viewBox="0 0 300 480"
                  >
                    <defs>
                      <mask id="inverted-mask">
                        <rect width="300" height="480" fill="white" />
                        <rect x="20" y="40" width="260" height="400" fill="black" rx="8" />
                      </mask>
                    </defs>
                    <rect
                      width="300"
                      height="480"
                      fill="black"
                      fillOpacity="0.5"
                      mask="url(#inverted-mask)"
                    />
                  </svg>
                </div>

                {/* Indicador de ayuda */}
                <div className="absolute top-1/4 left-0 right-0 text-center pointer-events-none">
                  <p className="text-primary text-xs font-medium drop-shadow-lg">Posiciona el INE aquí</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Canvas oculto */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Botones fijos en la parte inferior */}
      <div className="flex-shrink-0 flex gap-3 p-4 bg-black/80 backdrop-blur-sm safe-area-inset-bottom">
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl text-sm font-medium text-white bg-slate-700/50 hover:bg-slate-600/50 transition"
        >
          Cancelar
        </button>
        <button
          onClick={handleCapture}
          disabled={!isStreaming}
          className="flex-1 bg-primary hover:bg-primary-pressed text-white py-3 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition shadow-lg"
        >
          <CameraIcon className="w-5 h-5" />
          Capturar
        </button>
      </div>
    </div>
  );
}
