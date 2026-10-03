import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { EmblemMark } from './Emblem';

const paths: Record<string, ReactNode> = {
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  down: <path d="M12 4v16m-6-6 6 6 6-6" />,
  diagonal: <path d="M6 18 18 6M6 6h12v12" />,
  spark: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" /><path d="m20 2 .5 1.5L22 4l-1.5.5L20 6l-.5-1.5L18 4l1.5-.5Z" /></>,
  wave: <path d="M2 13h3l3-8 5 15 4-13 2 6h3" />,
  switch: <><path d="M4 12h6l6-6h4M16 18h4M10 12l3 3" /><circle cx="3" cy="12" r="1" /><circle cx="21" cy="6" r="1" /><circle cx="21" cy="18" r="1" /></>,
  layers: <><path d="m3 8 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 18l9 5 9-5" /></>,
  chip: <><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4M10 10h4v4h-4Z" /></>,
  users: <><circle cx="9" cy="7" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m1 4a5 5 0 0 1 4 5v2" /></>,
  server: <><rect x="3" y="3" width="18" height="7" rx="2" /><rect x="3" y="14" width="18" height="7" rx="2" /><path d="M7 6.5h.01M7 17.5h.01M13 6.5h4m-4 11h4" /></>,
  document: <><path d="M6 3h8l4 4v14H6V3Zm8 0v5h4M9 12h6m-6 4h6" /></>,
  sliders: <><path d="M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6M10 15v6" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2" /></>,
  moon: <path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  play: <path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none" />,
  pause: <path d="M7 5h3v14H7zM14 5h3v14h-3z" fill="currentColor" stroke="none" />,
  stop: <rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" stroke="none" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  calendar: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4m6-4v4M8 14h2m4 0h2m-8 3h2" /></>,
  signal: <><path d="M2 12c1.7-4.5 3.3-4.5 5 0s3.3 4.5 5 0 3.3-4.5 5 0" /><circle cx="20.5" cy="12" r="1.9" fill="currentColor" stroke="none" /></>,
  expand: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  shrink: <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />,
  grid: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9.3 4v16m5.4-16v16M4 9.3h16M4 14.7h16" /></>,
};
export function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <svg className={`icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.spark}</svg>;
}
/** Shared action contract. Features supply the destination and label, not a new button style. */
export function ActionLink({ variant = 'primary', icon = 'arrow', className = '', children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: 'primary' | 'secondary'; icon?: string }) {
  return <a {...props} className={`button button-${variant} ${className}`.trim()}>{children}<Icon name={icon} /></a>;
}
/** The logo: the GENESIS symbol and the name. The home page shows the symbol large above the name (`mark={false}`). */
export function Brand({ large = false, mark = true }: { large?: boolean; mark?: boolean }) {
  return <span className={`brand ${large ? 'brand-large' : ''}`}>{mark && <EmblemMark />}<span>GENESIS</span></span>;
}
/** Works at a domain root and under a static host's repository subpath. */
export function assetUrl(path: string) {
  return path.startsWith('/assets/') ? `${import.meta.env.BASE_URL}${path.slice(1)}` : path;
}
/** A section's eyebrow and title. Sections are named, not numbered: numbers are kept for real sequences (steps). */
export function SectionHeading({ eyebrow, children }: { eyebrow: string; children: ReactNode }) {
  return <div className="section-heading"><p className="eyebrow">{eyebrow}</p><h2>{children}</h2></div>;
}
