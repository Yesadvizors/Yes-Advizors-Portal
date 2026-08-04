/**
 * Inline SVG icon set — Lucide-style (24×24, stroke=currentColor, round caps).
 * Zero dependencies. Replaces the legacy emoji icons for the 2026 prototype.
 * DESIGN-ONLY / presentational. Each icon inherits color + size from CSS
 * (width/height default 1em unless overridden via props/size).
 */
function Svg({ size = 18, children, ...rest }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const IconOverview = (p) => <Svg {...p}><path d="M3 9.5 12 3l9 6.5" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></Svg>
export const IconDashboard = (p) => <Svg {...p}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></Svg>
export const IconTasks = (p) => <Svg {...p}><path d="M9 5h11" /><path d="M9 12h11" /><path d="M9 19h11" /><path d="m3.5 5 1 1 2-2" /><path d="m3.5 12 1 1 2-2" /><circle cx="4.5" cy="19" r="1.2" /></Svg>
export const IconClients = (p) => <Svg {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Svg>
export const IconCompliance = (p) => <Svg {...p}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /><path d="m9 15 2 2 4-4" /></Svg>
export const IconDocuments = (p) => <Svg {...p}><path d="M14 3v5h5" /><path d="M18 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8l6 6v10a2 2 0 0 1-2 2Z" /><path d="M9 13h6" /><path d="M9 17h4" /></Svg>
export const IconTeam = (p) => <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></Svg>
export const IconUsage = (p) => <Svg {...p}><path d="M3 3v18h18" /><path d="m7 14 3-4 3 3 4-6" /></Svg>
export const IconAudit = (p) => <Svg {...p}><path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5Z" /><path d="m9 12 2 2 4-4" /></Svg>
export const IconClient360 = (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.2" /><path d="M12 3v3" /><path d="M12 18v3" /><path d="M3 12h3" /><path d="M18 12h3" /></Svg>

export const IconSearch = (p) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></Svg>
export const IconMenu = (p) => <Svg {...p}><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></Svg>
export const IconChevronLeft = (p) => <Svg {...p}><path d="m15 18-6-6 6-6" /></Svg>
export const IconChevronRight = (p) => <Svg {...p}><path d="m9 18 6-6-6-6" /></Svg>
export const IconChevronDown = (p) => <Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>
export const IconBell = (p) => <Svg {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></Svg>
export const IconLogout = (p) => <Svg {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></Svg>
export const IconPlus = (p) => <Svg {...p}><path d="M12 5v14" /><path d="M5 12h14" /></Svg>
export const IconFilter = (p) => <Svg {...p}><path d="M3 5h18l-7 8v6l-4 2v-8Z" /></Svg>
export const IconCalendar = (p) => <Svg {...p}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Svg>
export const IconAlert = (p) => <Svg {...p}><path d="M10.3 3.2 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.2a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></Svg>
export const IconCheck = (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></Svg>
export const IconClock = (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>
export const IconArrowUp = (p) => <Svg {...p}><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></Svg>
export const IconArrowDown = (p) => <Svg {...p}><path d="M12 5v14" /><path d="m5 12 7 7 7-7" /></Svg>
export const IconBuilding = (p) => <Svg {...p}><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" /></Svg>
export const IconFile = (p) => <Svg {...p}><path d="M14 3v5h5" /><path d="M18 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8l6 6v10a2 2 0 0 1-2 2Z" /></Svg>
export const IconPhone = (p) => <Svg {...p}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z" /></Svg>
export const IconMail = (p) => <Svg {...p}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 6 10 7L22 6" /></Svg>
export const IconMore = (p) => <Svg {...p}><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></Svg>
export const IconExternal = (p) => <Svg {...p}><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></Svg>
export const IconTrend = (p) => <Svg {...p}><path d="m3 17 6-6 4 4 8-8" /><path d="M17 7h4v4" /></Svg>
export const IconInbox = (p) => <Svg {...p}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6Z" /></Svg>
export const IconRupee = (p) => <Svg {...p}><path d="M6 3h12" /><path d="M6 8h12" /><path d="M9 3c4 0 5 5 0 5" /><path d="M6 13h4l6 8" /></Svg>

/** Nav-icon lookup used by the shell (id → component). */
export const NAV_ICONS = {
  home: IconOverview,
  dashboard: IconDashboard,
  tasks: IconTasks,
  clients: IconClients,
  clientmaster: IconBuilding,
  client360: IconClient360,
  compliance: IconCompliance,
  documents: IconDocuments,
  team: IconTeam,
  usage: IconUsage,
  auditlog: IconAudit,
}
