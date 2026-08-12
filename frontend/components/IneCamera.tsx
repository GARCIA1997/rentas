'use client';

import { useEffect, useRef, useState } from 'react';
import { CameraIcon } from './icons';

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
            width: { ideal: 1280 },
            height: { ideal: 720 },
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
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="space-y-4">
      <div className="relative bg-black rounded-2xl overflow-hidden">
        {/* Video feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-auto"
          style={{ maxWidth: '100%' }}
        />

        {isStreaming && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* Recuadro guía — rectángulo que indica dónde poner el INE */}
            <div className="w-4/5 h-2/3 border-4 border-primary rounded-2xl opacity-70">
              {/* Esquinas marcadas */}
              <div className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-primary"></div>
              <div className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-primary"></div>
              <div className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-primary"></div>
              <div className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-primary"></div>
            </div>

            {/* Overlay oscuro alrededor del recuadro */}
            <div className="absolute inset-0 bg-black/40 pointer-events-none"></div>

            {/* Etiqueta */}
            <div className="absolute top-4 left-4 bg-primary text-white px-3 py-1 rounded-lg text-sm font-medium">
              {side === 'front' ? 'Frente del INE' : 'Reverso del INE'}
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Canvas oculto para captura */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Botones */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl text-sm font-medium text-muted bg-surface hover:bg-canvas"
        >
          Cancelar
        </button>
        <button
          onClick={handleCapture}
          disabled={!isStreaming}
          className="flex-1 bg-primary hover:bg-primary-pressed text-white py-3 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <CameraIcon className="w-4 h-4" />
          Capturar
        </button>
      </div>
    </div>
  );
}
