import type { ReactNode } from 'react';

const paths: Record<string, ReactNode> = {
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  down: <path d="M12 4v16m-6-6 6 6 6-6" />,
  diagonal: <path d="M6 18 18 6M6 6h12v12" />,
  spark: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" /><path d="m20 2 .5 1.5L22 4l-1.5.5L20 6l-.5-1.5L18 4l1.5-.5Z" /></>,
  wave: <path d="M2 13h3l3-8 5 15 4-13 2 6h3" />,
  switch: <><path d="M4 12h6l6-6h4M16 18h4M10 12l3 3" /><circle cx="3" cy="12" r="1" /><circle cx="21" cy="6" r="1" /><circle cx="21" cy="18" r="1" /></>,
  layers: <><path d="m3 8 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 18l9 5 9-5" /></>,
  chip: <><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4M10 10h4v4h-4Z" /></>,
  document: <><path d="M6 3h8l4 4v14H6V3Zm8 0v5h4M9 12h6m-6 4h6" /></>,
  sliders: <><path d="M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6M10 15v6" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2" /></>,
  moon: <path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  play: <path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none" />,
  stop: <rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" stroke="none" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></>,
};
export function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <svg className={`icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.spark}</svg>;
}
export function Brand({ large = false }: { large?: boolean }) {
  return <span className={`brand ${large ? 'brand-large' : ''}`}><img src={assetUrl('/assets/brand-mark.webp')} alt="" /><span>GENESIS</span></span>;
}
/** Works at a domain root and under a static host's repository subpath. */
export function assetUrl(path: string) {
  return path.startsWith('/assets/') ? `${import.meta.env.BASE_URL}${path.slice(1)}` : path;
}
export function SectionHeading({ number, eyebrow, children }: { number: string; eyebrow: string; children: ReactNode }) {
  return <div className="section-heading"><p className="eyebrow"><span>{number}</span> {eyebrow}</p><h2>{children}</h2></div>;
}
