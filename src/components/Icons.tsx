const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

export const IconCheck = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={3}><path d="M5 12l5 5L20 7" /></svg>
);
export const IconBack = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" {...base}><path d="M15 18l-6-6 6-6" /></svg>
);
export const IconPlay = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...base}><circle cx="12" cy="12" r="10" /><path d="M10 8l6 4-6 4z" /></svg>
);
export const IconSwap = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...base}><path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" /></svg>
);
export const IconToday = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" {...base}><path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11" /></svg>
);
export const IconProgress = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" {...base}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
);
export const IconSettings = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" {...base}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></svg>
);
export const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...base}><path d="M12 5v14M5 12h14" /></svg>
);
