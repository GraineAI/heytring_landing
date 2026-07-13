// Lightweight inline SVG icons — no external dependency.
const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" };

export const Phone = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M6.5 3.5 9 4l1 3.5-2 1.5a12 12 0 0 0 5 5l1.5-2 3.5 1 .5 2.5c0 1-1 2-2 2A15 15 0 0 1 4.5 5.5c0-1 1-2 2-2Z" />
  </svg>
);

export const PhoneOut = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M6.5 3.5 9 4l1 3.5-2 1.5a12 12 0 0 0 5 5l1.5-2 3.5 1 .5 2.5c0 1-1 2-2 2A15 15 0 0 1 4.5 5.5c0-1 1-2 2-2Z" />
    <path d="M15 8h5V3" /><path d="M20 3l-6 6" />
  </svg>
);

export const Wave = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M4 12v0M8 8v8M12 4v16M16 8v8M20 12v0" />
  </svg>
);

export const Shield = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M12 3 5 6v5c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z" /><path d="m9.5 12 1.8 1.8L15 10" />
  </svg>
);

export const Lock = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...s} {...p}>
    <rect x="5" y="10" width="14" height="10" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
);

export const Trash = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
  </svg>
);

export const Calendar = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...s} {...p}>
    <rect x="4" y="5" width="16" height="16" rx="3" /><path d="M4 9h16M8 3v4M16 3v4" />
  </svg>
);

export const Fork = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M6 3v6a2 2 0 0 0 4 0V3M8 9v12M17 3c-1.5 0-2 2-2 5s.5 4 2 4v9" />
  </svg>
);

export const Tools = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M14 6a3.5 3.5 0 0 0 4.6 4.6L21 13l-8 8-2.4-2.4A3.5 3.5 0 0 0 6 14L3 11l8-8 2.4 2.4Z" />
  </svg>
);

export const Receipt = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6" />
  </svg>
);

export const Building = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" /><path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1M3 21h18" />
  </svg>
);

export const Ban = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...s} {...p}>
    <circle cx="12" cy="12" r="8" /><path d="m7 7 10 10" />
  </svg>
);

export const Card = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...s} {...p}>
    <rect x="3" y="6" width="18" height="12" rx="2.5" /><path d="M3 10h18M7 15h3" />
  </svg>
);

export const Bell = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10 20a2 2 0 0 0 4 0" />
  </svg>
);

export const Eye = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="2.5" />
  </svg>
);

export const Note = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M14 3v5h5M8 13h8M8 17h5" />
  </svg>
);

export const Check = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...s} strokeWidth="2.4" {...p}>
    <path d="m5 13 4 4L19 7" />
  </svg>
);

export const Arrow = (p) => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const ChevRight = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...s} strokeWidth="2.2" {...p}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const Globe = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...s} {...p}>
    <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
  </svg>
);

export const Apple = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M16.4 12.9c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.8-3-.8-1.5 0-2.9.9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 .7 1.1 1.6 2.3 2.7 2.2 1.1 0 1.5-.7 2.8-.7 1.3 0 1.6.7 2.8.7 1.2 0 1.9-1.1 2.6-2.1.8-1.2 1.2-2.4 1.2-2.4s-2.2-.9-2.3-3.5Zm-2.3-6.5c.6-.7 1-1.7.9-2.8-.9 0-2 .6-2.6 1.4-.6.6-1 1.7-.9 2.7 1 .1 2-.6 2.6-1.3Z" />
  </svg>
);

export const Play = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M4 3.2c-.3.2-.5.5-.5 1v15.6c0 .5.2.8.5 1l8.5-9.8L4 3.2Z" opacity=".95" />
    <path d="m14.5 9.2-2.6 2.8 2.6 2.8 4-2.3c.7-.4.7-1.5 0-1.9l-4-1.4Z" />
    <path d="m4 3.2 8.5 8 2-2.3L5.8 2.6c-.6-.4-1.3-.1-1.8.6Z" opacity=".8" />
    <path d="m4 20.8 8.5-8 2 2.3-8.7 6.3c-.6.4-1.3.1-1.8-.6Z" opacity=".85" />
  </svg>
);
