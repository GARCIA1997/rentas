'use client';

import Link from 'next/link';
import { MaintenanceReport, MaintenanceReportStatus, maintenanceReportStatusLabels } from '@/lib/api';
import { formatDate } from '@/lib/formatDate';

// Tarjeta de reporte portada de Stitch (design/stitch/reports-inbox.html). La usan el inbox
// global del admin, el perfil del inquilino (lado admin) y el portal del inquilino.
export const reportStatusBadge: Record<MaintenanceReportStatus, string> = {
  REPORTED: 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]',
  IN_PROGRESS: 'bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]',
  CLOSED: 'bg-[#2D9E6B]/15 text-[#2D9E6B] border border-[#2D9E6B]/30',
};

export const reportFolio = (r: MaintenanceReport) => `#REP-${r.id.slice(-4).toUpperCase()}`;

export function ReportCard({ report, href, showTenant = true }: { report: MaintenanceReport; href: string; showTenant?: boolean }) {
  return (
    <Link
      href={href}
      className="block bg-[#ffffff] border border-[#A7B0BB]/30 rounded-lg p-3.5 shadow-[0_1px_3px_rgba(23,58,95,0.05)] hover:border-[#173a5f]/40 transition-all"
    >
      <div className="flex items-center justify-between pb-2 border-b border-[#E2E6EA]">
        <div className="flex items-center gap-2">
          {report.status === 'REPORTED' && <span className="w-2 h-2 rounded-full bg-[#2D9E6B] flex-shrink-0 animate-pulse"></span>}
          <span className="text-label-md font-sans text-[#173a5f]">{reportFolio(report)}</span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-label-sm font-sans font-semibold ${reportStatusBadge[report.status]}`}>
          {maintenanceReportStatusLabels[report.status]}
        </span>
      </div>
      <div className="pt-2.5">
        {showTenant && <h2 className="text-label-lg font-sans text-[#173a5f] font-semibold">{report.tenant?.fullName ?? '—'}</h2>}
        <div className="flex items-center gap-1 text-body-sm font-sans text-[#73777f] mt-0.5">
          <span className="material-symbols-outlined text-[16px] text-[#73777f]">apartment</span>
          <span>{report.property?.name ?? 'Sin propiedad'}</span>
        </div>
      </div>
      <p className="mt-2 text-body-sm font-sans text-[#43474e] line-clamp-2 leading-relaxed">{report.description}</p>
      <div className="mt-3 pt-2.5 border-t border-[#F1EEE5] flex items-center justify-between text-body-sm font-sans text-[#73777f]">
        <span className="flex items-center gap-1 text-[#73777f]">
          <span className="material-symbols-outlined text-[15px]">calendar_today</span>
          <span>{formatDate(report.createdAt)}</span>
        </span>
        <span className="material-symbols-outlined text-[#73777f] text-[18px]">chevron_right</span>
      </div>
    </Link>
  );
}
