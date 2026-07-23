import type { ReactNode, SVGProps } from "react";

const PATHS = {
  home: (
    <>
      <path d="m3.5 11.5 8.5-7 8.5 7" />
      <path d="M5.5 10.5V20h13v-9.5M9.5 20v-6h5v6" />
    </>
  ),
  projects: (
    <>
      <path d="M3.5 6.5h6l2-2h9v15h-17z" />
      <path d="M3.5 9h17" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18h1.2a2.2 2.2 0 0 0 1.7-3.6 2.2 2.2 0 0 1 1.7-3.6H18a3 3 0 0 0 3-3A9 9 0 0 0 12 3Z" />
      <circle cx="7.5" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="10" cy="6.8" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.2" cy="6.7" r="1" fill="currentColor" stroke="none" />
      <circle cx="17" cy="9.7" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 20c.6-4 2.8-6 6.5-6s5.9 2 6.5 6" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l1.6-2.5h6.8L17 8h3v11H4z" />
      <circle cx="12" cy="13.5" r="3.3" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="9.5" r="1.5" />
      <path d="m5 17 4.2-4 3 2.8 2.4-2.2L19 17" />
    </>
  ),
  imagePlus: (
    <>
      <rect x="3.5" y="5.5" width="13" height="14" rx="2" />
      <path d="m5 17 3.5-3.5 2.5 2.3 2-1.8 2 2" />
      <path d="M19 4v6M16 7h6" />
    </>
  ),
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4.5 7 7.5 6 7.5-6" />
    </>
  ),
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />
    </>
  ),
  moon: <path d="M19.5 15.5A8 8 0 0 1 8.5 4.5a8.2 8.2 0 1 0 11 11Z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="1.5" />
      <path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17" />
    </>
  ),
  guides: (
    <>
      <circle cx="12" cy="12" r="5" />
      <path d="M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5" />
    </>
  ),
  value: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5a8.5 8.5 0 0 0 0 17Z" fill="currentColor" stroke="none" opacity=".75" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 6h7M15 6h5M4 12h3M11 12h9M4 18h10M18 18h2" />
      <circle cx="13" cy="6" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="16" cy="18" r="2" />
    </>
  ),
  flip: (
    <>
      <path d="M8 7H4l3-3M4 7c1.2 0 2.3.5 3.2 1.4L16 17" />
      <path d="M16 17h4l-3 3M20 17c-1.2 0-2.3-.5-3.2-1.4L8 7" />
      <path d="m14.5 8.5 1.5-1.5h4M4 17h4l1.5-1.5" />
    </>
  ),
  edit: (
    <>
      <path d="m4 20 4.2-1 10.5-10.5-3.2-3.2L5 15.8Z" />
      <path d="m13.8 7 3.2 3.2" />
    </>
  ),
  maximize: <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />,
  x: <path d="m6 6 12 12M18 6 6 18" />,
  check: <path d="m5 12.5 4.2 4.2L19 7" />,
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.2a2.6 2.6 0 1 1 4.3 2c-1.2.8-1.9 1.3-1.9 2.8" />
      <circle cx="12" cy="17.2" r=".8" fill="currentColor" stroke="none" />
    </>
  ),
  pipette: (
    <>
      <path d="m14.5 4.5 5 5M12.5 6.5l5 5M16 3l5 5-3 3-5-5Z" />
      <path d="m14.5 9.5-9 9v2h2l9-9" />
    </>
  ),
  listCheck: (
    <>
      <path d="m4 6 1.5 1.5L8 5M11 6h9M4 12l1.5 1.5L8 11M11 12h9M4 18l1.5 1.5L8 17M11 18h9" />
    </>
  ),
  compare: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <path d="M12 5v14M7.5 12h-2M18.5 12h-2" />
    </>
  ),
  brush: (
    <>
      <path d="m14 4 6 6-8 8-6-6Z" />
      <path d="M9 15c-1.5 0-2.8.6-3.5 1.8-.7 1.2-.4 2.3-2.5 3.2 4.5.7 7.5-.8 7.5-3.3" />
    </>
  ),
  hash: <path d="M9 3 7 21M17 3l-2 18M4 9h16M3 15h16" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  arrowRight: <path d="M4 12h16M14 6l6 6-6 6" />,
  arrowLeft: <path d="M20 12H4M10 6l-6 6 6 6" />,
  reset: (
    <>
      <path d="M4 8V3m0 0h5M4 3l3.3 3.3A8 8 0 1 1 4.7 15" />
    </>
  ),
  zoomIn: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5M10.5 7.5v6M7.5 10.5h6" />
    </>
  ),
  zoomOut: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5M7.5 10.5h6" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13M10 11v5M14 11v5" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="11" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2" />
    </>
  ),
  archive: (
    <>
      <path d="M4 8h16v12H4zM3 4h18v4H3zM9 12h6" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12M7 10l5 5 5-5M4 20h16" />
    </>
  ),
  printer: (
    <>
      <path d="M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7z" />
      <circle cx="17" cy="11" r=".8" fill="currentColor" stroke="none" />
    </>
  ),
  logout: <path d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10" />,
  sparkles: (
    <>
      <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2ZM18.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8ZM5.5 14l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z" />
    </>
  ),
  layers: <path d="m12 3 9 5-9 5-9-5ZM3 12l9 5 9-5M3 16l9 5 9-5" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
  label?: string;
}

export function Icon({ name, size = 18, label, strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg
      {...props}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
