'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MaintenanceReport, maintenanceReportStatusLabels } from '@/lib/api';
import { formatDate } from '@/lib/formatDate';
import { reportFolio } from '@/components/ReportCard';

// Píldora de estatus sobre el encabezado azul (tenant-chat.html).
const headerBadge: Record<MaintenanceReport['status'], { box: string; dot: string; text: string }> = {
  REPORTED: { box: 'bg-[#D9822B]/20 border-[#D9822B]/40', dot: 'bg-[#F5B66B]', text: 'text-[#F5B66B]' },
  IN_PROGRESS: { box: 'bg-[#8cf8bd]/20 border-[#70dba2]/40', dot: 'bg-[#70dba2] animate-pulse', text: 'text-[#8cf8bd]' },
  CLOSED: { box: 'bg-white/10 border-white/30', dot: 'bg-[#A7B0BB]', text: 'text-white/80' },
};

const time = (iso: string) => new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) + ' hrs';
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

interface Bubble {
  id: string;
  body: string;
  createdAt: string;
  fromViewer: boolean;
  fromAdmin: boolean;
}

/**
 * Vista de chat compartida entre el inquilino (/profile/reports/[id]) y el admin
 * (/tenants/[id]/reports/[reportId]) — mismo hilo, sólo cambia quién es "yo" (viewerRole)
 * y qué controles extra ve cada quien (headerExtra, para los botones de estatus del admin).
 * Markup portado de Stitch: design/stitch/tenant-chat.html (pantalla completa, sin tab bar).
 */
export function ReportConversation({
  report,
  viewerRole,
  onSend,
  headerExtra,
  backHref,
  backLabel,
}: {
  report: MaintenanceReport;
  viewerRole: 'ADMIN' | 'INQUILINO';
  onSend: (body: string) => Promise<void>;
  headerExtra?: ReactNode;
  backHref: string;
  backLabel: string;
}) {
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const isClosed = report.status === 'CLOSED';
  const badge = headerBadge[report.status];

  // El primer mensaje del hilo siempre es el reporte original — lo escribió el
  // inquilino, así que nunca "es del visor" cuando quien mira es el admin, y sí lo es
  // cuando quien mira es el propio inquilino.
  const bubbles: Bubble[] = [
    { id: 'description', body: report.description, createdAt: report.createdAt, fromViewer: viewerRole === 'INQUILINO', fromAdmin: false },
    ...(report.messages ?? []).map((message) => ({
      id: message.id,
      body: message.body,
      createdAt: message.createdAt,
      fromViewer: message.sender?.role === viewerRole,
      fromAdmin: message.sender?.role === 'ADMIN',
    })),
  ];

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [bubbles.length]);

  const handleSend = async () => {
    if (!draft.trim() || isSending) return;
    setIsSending(true);
    try {
      await onSend(draft.trim());
      setDraft('');
    } finally {
      setIsSending(false);
    }
  };

  const tenantInitials = (report.tenant?.fullName ?? '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="w-full h-[100dvh] sm:h-screen bg-[#fdf9f0] flex flex-col">
      <header className="bg-[#173a5f] text-[#ffffff] flex flex-col w-full shrink-0 pt-[env(safe-area-inset-top)]">
        <div className="max-w-2xl w-full mx-auto">
          <div className="flex justify-between items-center w-full px-4 pt-3 pb-2">
            <Link href={backHref} className="flex items-center gap-1.5 text-[#ffffff] hover:opacity-90 active:scale-[0.98] transition-all min-w-0">
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              <span className="font-sans text-label-md truncate">{backLabel}</span>
            </Link>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${badge.box}`}>
              <span className={`w-2 h-2 rounded-full ${badge.dot}`}></span>
              <span className={`font-sans text-label-sm font-semibold ${badge.text}`}>{maintenanceReportStatusLabels[report.status]}</span>
            </div>
          </div>
          <div className="px-4 pb-3 pt-0.5">
            <h1 className="font-sans text-headline-sm text-[#ffffff] font-bold tracking-tight">Reporte {reportFolio(report)}</h1>
            <p className="font-sans text-body-sm text-[#ffffff]/80 truncate">
              {viewerRole === 'ADMIN' ? `${report.tenant?.fullName ?? ''} · ` : ''}
              {report.property?.name ?? 'Sin propiedad'}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="max-w-2xl mx-auto px-4 py-3.5 space-y-4">
          <section className="bg-[#ffffff] rounded-lg border border-[#c3c6cf]/30 p-3.5">
            <div className="flex items-center gap-2 border-b border-[#c3c6cf]/20 pb-2.5 mb-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#f1eee5] flex items-center justify-center text-[#173a5f]">
                <span className="material-symbols-outlined text-[18px]">build</span>
              </div>
              <div>
                <span className="font-sans text-label-sm text-[#43474e] block uppercase tracking-wider">Incidencia</span>
                <span className="font-sans text-label-md text-[#173a5f] font-semibold">Mantenimiento</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-left">
              <div className="bg-[#f7f3ea] rounded-lg p-2 border border-[#c3c6cf]/20">
                <span className="font-sans text-body-sm text-[#43474e] block">Apertura</span>
                <span className="font-sans text-label-md text-[#1c1c16] font-medium">{formatDate(report.createdAt)} · {time(report.createdAt)}</span>
              </div>
              <div className="bg-[#f7f3ea] rounded-lg p-2 border border-[#c3c6cf]/20">
                <span className="font-sans text-body-sm text-[#43474e] block">Mensajes</span>
                <span className="font-sans text-label-md text-[#1c1c16] font-medium">{bubbles.length}</span>
              </div>
            </div>
            {headerExtra && <div className="mt-3">{headerExtra}</div>}
          </section>

          {bubbles.map((bubble, i) => {
            const showDay = i === 0 || new Date(bubbles[i - 1].createdAt).toDateString() !== new Date(bubble.createdAt).toDateString();
            return (
              <div key={bubble.id} className="space-y-4">
                {showDay && (
                  <div className="flex justify-center my-2">
                    <span className="bg-[#ece8df] text-[#43474e] px-3 py-1 rounded-full font-sans text-label-sm border border-[#c3c6cf]/30 capitalize">
                      {dayLabel(bubble.createdAt)}
                    </span>
                  </div>
                )}
                {bubble.fromViewer ? (
                  <div className="flex flex-col items-end w-full pl-8">
                    <div className="bg-[#173a5f] text-[#ffffff] rounded-lg rounded-br-none p-3 max-w-[90%]">
                      <p className="font-sans text-body-md leading-relaxed text-left text-[#ffffff] whitespace-pre-wrap break-words">{bubble.body}</p>
                    </div>
                    <div className="flex items-center gap-1 mt-1 pr-1">
                      <span className="font-sans text-body-sm text-[#43474e]">{time(bubble.createdAt)}</span>
                      <span className="material-symbols-outlined text-[14px] text-[#73777f]">done_all</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 pr-8">
                    <div
                      className={`w-8 h-8 rounded-lg text-[#ffffff] flex-shrink-0 flex items-center justify-center font-sans text-label-md font-bold border border-[#c3c6cf]/30 ${
                        bubble.fromAdmin ? 'bg-[#173a5f]' : 'bg-[#2D9E6B]'
                      }`}
                    >
                      {bubble.fromAdmin ? 'KS' : tenantInitials}
                    </div>
                    <div className="flex flex-col items-start w-full">
                      <div className="bg-[#ffffff] text-[#1c1c16] border border-[#c3c6cf]/30 rounded-lg rounded-tl-none p-3 max-w-[95%]">
                        <span className="font-sans text-label-sm font-semibold text-[#173a5f] block mb-1">
                          {bubble.fromAdmin ? 'KsaRed Admin' : report.tenant?.fullName ?? 'Inquilino'}
                        </span>
                        <p className="font-sans text-body-md text-[#1c1c16] leading-relaxed whitespace-pre-wrap break-words">{bubble.body}</p>
                      </div>
                      <span className="font-sans text-body-sm text-[#43474e] mt-1 pl-1">{time(bubble.createdAt)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      </div>

      <footer className="shrink-0 bg-[#ffffff] border-t border-[#c3c6cf]/30 pb-[env(safe-area-inset-bottom)]">
        {isClosed ? (
          <div className="p-4 pb-5 text-center bg-[#f1eee5]">
            <div className="flex items-center justify-center gap-1.5 text-[#43474e]">
              <span className="material-symbols-outlined text-[18px] text-[#73777f]">lock</span>
              <p className="font-sans text-label-md text-[#43474e] font-medium">Esta conversación está cerrada</p>
            </div>
            <p className="font-sans text-body-sm text-[#73777f] mt-0.5">
              {viewerRole === 'INQUILINO' ? 'Si requieres nueva asistencia, crea un nuevo reporte.' : 'Reábrela cambiando el estatus si necesitas responder.'}
            </p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto p-3 pb-4 flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="w-full bg-[#f7f3ea] border border-[#c3c6cf]/40 rounded-lg px-3 py-2 text-[#1c1c16] font-sans text-body-md placeholder:text-[#73777f] focus:outline-none focus:border-[#173a5f] focus:ring-1 focus:ring-[#173a5f] transition-all"
                placeholder="Escribe un mensaje..."
                type="text"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={isSending || !draft.trim()}
              className="bg-[#2D9E6B] text-[#ffffff] px-3.5 h-10 rounded-lg font-sans text-label-md flex items-center justify-center gap-1 hover:opacity-90 active:scale-95 transition-all flex-shrink-0 disabled:opacity-50"
              type="button"
            >
              <span>{isSending ? 'Enviando' : 'Enviar'}</span>
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </div>
        )}
      </footer>
    </div>
  );
}
