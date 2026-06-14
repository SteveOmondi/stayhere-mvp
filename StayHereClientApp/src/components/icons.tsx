import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, className, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IcoHome = (p: IconProps) => (
  <Svg {...p}><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h14V10" /></Svg>
);
export const IcoSearch = (p: IconProps) => (
  <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></Svg>
);
export const IcoHeart = (p: IconProps) => (
  <Svg {...p}><path d="M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9Z" /></Svg>
);
export const IcoHeartFilled = ({ size = 20, className, ...rest }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true" {...rest}>
    <path d="M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9Z" />
  </svg>
);
export const IcoMap = (p: IconProps) => (
  <Svg {...p}><path d="m9 4 6 2 5-2v14l-5 2-6-2-5 2V6l5-2Z" /><path d="M9 4v14M15 6v14" /></Svg>
);
export const IcoBed = (p: IconProps) => (
  <Svg {...p}><path d="M3 7v11M3 13h18v5M21 13v-2a3 3 0 0 0-3-3H8v5" /></Svg>
);
export const IcoBath = (p: IconProps) => (
  <Svg {...p}><path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3Z" /><path d="M6 12V5a2 2 0 0 1 2-2 2 2 0 0 1 2 2M5 19l-1 2M20 19l1 2" /></Svg>
);
export const IcoRuler = (p: IconProps) => (
  <Svg {...p}><rect x="3" y="8" width="18" height="8" rx="1.5" /><path d="M7 8v3M11 8v4M15 8v3M19 8v4" /></Svg>
);
export const IcoStar = (p: IconProps) => (
  <Svg {...p}><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z" /></Svg>
);
export const IcoStarFilled = ({ size = 20, className, ...rest }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true" {...rest}>
    <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z" />
  </svg>
);
export const IcoX = (p: IconProps) => (
  <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>
);
export const IcoMenu = (p: IconProps) => (
  <Svg {...p}><path d="M3 6h18M3 12h18M3 18h18" /></Svg>
);
export const IcoUser = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 20a8 8 0 0 1 16 0" /></Svg>
);
export const IcoLogout = (p: IconProps) => (
  <Svg {...p}><path d="M9 4H5v16h4M16 12H9M13 8l4 4-4 4" /></Svg>
);
export const IcoChat = (p: IconProps) => (
  <Svg {...p}><path d="M4 5h16v11H8l-4 4V5Z" /></Svg>
);
export const IcoSend = (p: IconProps) => (
  <Svg {...p}><path d="m4 12 16-8-6 16-3-6-7-2Z" /></Svg>
);
export const IcoLoader = ({ size = 20, className, ...rest }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" className={`animate-spin-slow ${className ?? ""}`} aria-hidden="true" {...rest}>
    <path d="M12 3a9 9 0 1 0 9 9" />
  </svg>
);
export const IcoChevDown = (p: IconProps) => (
  <Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>
);
export const IcoChevRight = (p: IconProps) => (
  <Svg {...p}><path d="m9 6 6 6-6 6" /></Svg>
);
export const IcoChevLeft = (p: IconProps) => (
  <Svg {...p}><path d="m15 6-6 6 6 6" /></Svg>
);
export const IcoPlus = (p: IconProps) => (
  <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
);
export const IcoMinus = (p: IconProps) => (
  <Svg {...p}><path d="M5 12h14" /></Svg>
);
export const IcoCheck = (p: IconProps) => (
  <Svg {...p}><path d="m5 12 5 5L20 7" /></Svg>
);
export const IcoFilter = (p: IconProps) => (
  <Svg {...p}><path d="M3 5h18l-7 8v6l-4-2v-4L3 5Z" /></Svg>
);
export const IcoGrid = (p: IconProps) => (
  <Svg {...p}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></Svg>
);
export const IcoList = (p: IconProps) => (
  <Svg {...p}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></Svg>
);
export const IcoLocation = (p: IconProps) => (
  <Svg {...p}><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></Svg>
);
export const IcoPhone = (p: IconProps) => (
  <Svg {...p}><path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" /></Svg>
);
export const IcoEmail = (p: IconProps) => (
  <Svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></Svg>
);
export const IcoBuilding = (p: IconProps) => (
  <Svg {...p}><rect x="5" y="3" width="14" height="18" rx="1" /><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01M10 21v-3h4v3" /></Svg>
);
export const IcoCar = (p: IconProps) => (
  <Svg {...p}><path d="M5 11l1.5-4h11L19 11M3 16h18v-3l-2-2H5l-2 2v3Z" /><circle cx="7.5" cy="16.5" r="1.5" /><circle cx="16.5" cy="16.5" r="1.5" /></Svg>
);
export const IcoWifi = (p: IconProps) => (
  <Svg {...p}><path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8 16a6 6 0 0 1 8 0" /><circle cx="12" cy="20" r="0.6" fill="currentColor" /></Svg>
);
export const IcoPool = (p: IconProps) => (
  <Svg {...p}><path d="M3 18c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1M8 14V6a2 2 0 0 1 4 0M8 10h4" /></Svg>
);
export const IcoGym = (p: IconProps) => (
  <Svg {...p}><path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" /></Svg>
);
export const IcoSecurity = (p: IconProps) => (
  <Svg {...p}><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></Svg>
);
export const IcoElevator = (p: IconProps) => (
  <Svg {...p}><rect x="5" y="3" width="14" height="18" rx="1" /><path d="M12 3v18M9 9l-1.5 2h3L9 9M15 15l1.5-2h-3L15 15" /></Svg>
);
export const IcoKey = (p: IconProps) => (
  <Svg {...p}><circle cx="8" cy="8" r="4" /><path d="m11 11 8 8M16 16l2-2M18 18l2-2" /></Svg>
);
export const IcoCalendar = (p: IconProps) => (
  <Svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></Svg>
);
export const IcoWallet = (p: IconProps) => (
  <Svg {...p}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M16 14h2" /></Svg>
);
export const IcoBell = (p: IconProps) => (
  <Svg {...p}><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10 20a2 2 0 0 0 4 0" /></Svg>
);
export const IcoArrowRight = (p: IconProps) => (
  <Svg {...p}><path d="M4 12h16M14 6l6 6-6 6" /></Svg>
);
export const IcoSparkle = (p: IconProps) => (
  <Svg {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" /></Svg>
);
export const IcoShare = (p: IconProps) => (
  <Svg {...p}><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6" /></Svg>
);
export const IcoEye = (p: IconProps) => (
  <Svg {...p}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></Svg>
);
