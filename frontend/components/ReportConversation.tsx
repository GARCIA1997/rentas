'use client';

import { ReactNode, useState } from 'react';
import { MaintenanceReport, maintenanceReportStatusLabels } from '@/lib/api';
import { formatDate } from '@/lib/formatDate';

const statusColors: Record<MaintenanceReport['status'], string> = {
  CLOSED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  IN_PROGRESS: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300',
  REPORTED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
};

interface Bubble {
  id: string;
  body: string;
  createdAt: string;
  fromViewer: boolean;
}

/**
 * Vista de chat compartida entre el inquilino (/profile/reports/[id]) y el admin
 * (/tenants/[id]/reports/[reportId]) — mismo hilo, sólo cambia quién es "yo" (viewerRole)
 * y qué controles extra ve cada quien (headerExtra, para los botones de estatus del admin).
 */
export function ReportConversation({
  report,
  viewerRole,
  onSend,
  headerExtra,
}: {
  report: MaintenanceReport;
  viewerRole: 'ADMIN' | 'INQUILINO';
  onSend: (body: string) => Promise<void>;
  headerExtra?: ReactNode;
}) {
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);

  const isClosed = report.status === 'CLOSED';

  // El primer mensaje del hilo siempre es el reporte original — lo escribió el
  // inquilino, así que nunca "es del visor" cuando quien mira es el admin, y sí lo es
  // cuando quien mira es el propio inquilino.
  const bubbles: Bubble[] = [
    {
      id: 'description',
      body: report.description,
      createdAt: report.createdAt,
      fromViewer: viewerRole === 'INQUILINO',
    },
    ...(report.messages ?? []).map((message) => ({
      id: message.id,
      body: message.body,
      createdAt: message.createdAt,
      fromViewer: message.sender?.role === viewerRole,
    })),
  ];

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

  return (
    <div className="flex flex-col h-full">
      <div className="bg-surface rounded-2xl shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between gap-3">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[report.status]}`}>
            {maintenanceReportStatusLabels[report.status]}
          </span>
          {report.property?.name && <span className="text-muted text-xs truncate">{report.property.name}</span>}
        </div>
        {headerExtra && <div className="mt-3">{headerExtra}</div>}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pb-4">
        {bubbles.map((bubble) => (
          <div key={bubble.id} className={`flex ${bubble.fromViewer ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                bubble.fromViewer
                  ? 'bg-primary text-white rounded-br-sm'
                  : 'bg-surface text-heading rounded-bl-sm shadow-sm'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap break-words">{bubble.body}</p>
              <p className={`text-[10px] mt-1 ${bubble.fromViewer ? 'text-white/70' : 'text-muted'}`}>
                {formatDate(bubble.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {isClosed ? (
        <p className="text-muted text-sm text-center py-3 mb-[env(safe-area-inset-bottom)] bg-canvas rounded-xl">
          Esta conversación está cerrada.
        </p>
      ) : (
        <div className="flex items-end gap-2 sticky bottom-0 bg-canvas pt-2 pb-[env(safe-area-inset-bottom)]">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            placeholder="Escribe un mensaje..."
            className="flex-1 px-3 py-2.5 border border-black/10 dark:border-white/10 bg-surface text-heading rounded-xl focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          <button
            onClick={handleSend}
            disabled={isSending || !draft.trim()}
            className="bg-primary hover:bg-primary-pressed text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 shrink-0"
          >
            {isSending ? '...' : 'Enviar'}
          </button>
        </div>
      )}
    </div>
  );
}
