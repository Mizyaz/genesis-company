import { lazy, Suspense, useState } from 'react';
import { assetUrl } from './ui';
import '../styles/chip3d.css';

const Layers3D = lazy(() => import('./Layers3D'));

/** The validated layout in 3D: a still picture of its layer stack until the reader taps it; only then the 3D view and
 * its layer pictures load. */
export function Chip3D({ label, open }: { label: string; open: string }) {
  const [on, setOn] = useState(false);
  const poster = <img src={assetUrl('/assets/layers3d/poster.webp')} width={900} height={620} alt={label} loading="lazy" decoding="async" />;
  return <figure className="chip3d">
    {on ? <Suspense fallback={<div className="chip3d-poster">{poster}</div>}><Layers3D /></Suspense>
      : <button type="button" className="chip3d-poster" onClick={() => setOn(true)} aria-label={`${label}. ${open}`}>{poster}<span aria-hidden="true">{open}</span></button>}
  </figure>;
}
