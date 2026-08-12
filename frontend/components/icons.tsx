// Minimal hand-drawn outline icon set (no external icon library dependency).
// Consistent 24x24 viewBox, 1.75 stroke width, rounded caps — matches an
// iOS-style outline aesthetic.

import { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { active?: boolean };

const base = (active?: boolean) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: active ? 2.1 : 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export function HomeIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9v10a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V9" />
    </svg>
  );
}

export function BuildingIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <rect x="4" y="3.5" width="10" height="17" rx="1" />
      <rect x="14" y="9.5" width="6" height="11" rx="1" />
      <path d="M7 7h1M7 10.5h1M7 14h1M10.5 7h1M10.5 10.5h1M10.5 14h1M17 13h.01M17 16.5h.01" />
    </svg>
  );
}

export function UsersIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19.5c0-3 2.5-5.25 5.5-5.25s5.5 2.25 5.5 5.25" />
      <path d="M15.5 5.5a3 3 0 0 1 0 5.9" />
      <path d="M15.5 14.25c2.35.3 4 2.3 4 5.25" />
    </svg>
  );
}

export function DocumentIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <path d="M7 3.5h7l4 4V19a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M14 3.5V8h4" />
      <path d="M8.5 12.5h7M8.5 15.5h7M8.5 9.5h3" />
    </svg>
  );
}

export function CashIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <rect x="2.5" y="6.5" width="19" height="12" rx="1.5" />
      <circle cx="12" cy="12.5" r="3" />
      <path d="M6 6.5v-1a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v1" />
    </svg>
  );
}

export function MoreIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SettingsIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2M12 18.5v2M4.9 6.9l1.4 1.4M17.7 15.7l1.4 1.4M3.5 12h2M18.5 12h2M4.9 17.1l1.4-1.4M17.7 8.3l1.4-1.4" />
    </svg>
  );
}

export function UserCircleIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="10" r="2.75" />
      <path d="M6.2 18.2c1-2.4 3.2-3.7 5.8-3.7s4.8 1.3 5.8 3.7" />
    </svg>
  );
}

export function LogoutIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <path d="M9 20H5.5A1.5 1.5 0 0 1 4 18.5v-13A1.5 1.5 0 0 1 5.5 4H9" />
      <path d="M16 16.5 20.5 12 16 7.5" />
      <path d="M20.5 12h-11" />
    </svg>
  );
}

export function SunIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </svg>
  );
}

export function MoonIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <path d="M20 14.2A8.5 8.5 0 1 1 9.8 4a6.8 6.8 0 0 0 10.2 10.2Z" />
    </svg>
  );
}

export function DesktopIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

export function ChevronRightIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function PlusIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function ArrowLeftIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <path d="m11 5-6 7 6 7M5 12h14" />
    </svg>
  );
}

export function CheckCircleIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.3 2.3 2.3 4.7-5.2" />
    </svg>
  );
}

export function WhatsAppIcon({ active, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12.04 2.5c-5.26 0-9.54 4.28-9.54 9.54 0 1.68.44 3.32 1.28 4.77L2.5 21.5l4.83-1.27a9.5 9.5 0 0 0 4.71 1.25h.01c5.26 0 9.54-4.28 9.54-9.54 0-2.55-.99-4.94-2.79-6.74a9.47 9.47 0 0 0-6.76-2.7Zm0 17.46h-.01a7.9 7.9 0 0 1-4.03-1.1l-.29-.17-2.87.75.77-2.8-.19-.29a7.9 7.9 0 0 1-1.22-4.21c0-4.38 3.56-7.94 7.95-7.94a7.9 7.9 0 0 1 5.62 2.33 7.9 7.9 0 0 1 2.32 5.62c0 4.38-3.57 7.94-7.95 7.94Zm4.35-5.95c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1-.37-1.9-1.17-.7-.63-1.18-1.4-1.31-1.64-.14-.24-.01-.37.1-.49.11-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.13 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
    </svg>
  );
}

export function DownloadIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <path d="M12 2.5v11M7 9l5 5 5-5M4.5 20.5h15" />
    </svg>
  );
}

export function PencilIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="M13.5 8 16 10.5" />
    </svg>
  );
}

export function TrashIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <path d="M5 7h14M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2M7 7l1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function BellIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2.5h-15L6 17Z" />
      <path d="M10 21.5a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function BanknoteIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <rect x="2.5" y="6" width="19" height="12" rx="1.5" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M5.5 9h.01M18.5 15h.01" />
    </svg>
  );
}

export function UndoIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <path d="M7 10 3.5 6.5 7 3" />
      <path d="M3.5 6.5H14a6 6 0 1 1 0 12H8" />
    </svg>
  );
}

export function XCircleIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </svg>
  );
}

export function InfoIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.75h.01" />
    </svg>
  );
}

export function AlertTriangleIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <path d="M12 3.5 21.5 20h-19L12 3.5Z" />
      <path d="M12 9.5v4.5M12 17h.01" />
    </svg>
  );
}

export function CameraIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <path d="M4 8.5a1 1 0 0 1 1-1h2l1.2-2h7.6l1.2 2h2a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8.5Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}
