import { useLanguage } from './Language';
import { useEffect, useId, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './image-viewer.css';

export type ImageViewport = { x: number; y: number; width: number; height: number };
export type ImageViewerProps = { src: string; alt: string; title?: string; caption?: string; toolbar?: ReactNode; viewport?: ImageViewport; mediaClassName?: string; onClose: () => void };
type Point = { x: number; y: number };
type Camera = Point & { scale: number };
type Frame = Point & { width: number; height: number };
const limitScale = (value: number) => Math.max(0.01, Math.min(16, value));

function contain(frame: Frame): Frame {
  const maxWidth = Math.max(1, window.innerWidth - 16), maxHeight = Math.max(1, window.innerHeight - 16);
  const width = Math.min(maxWidth, Math.max(Math.min(340, maxWidth), frame.width));
  const height = Math.min(maxHeight, Math.max(Math.min(280, maxHeight), frame.height));
  return { width, height, x: Math.max(8, Math.min(window.innerWidth - width - 8, frame.x)),
    y: Math.max(8, Math.min(window.innerHeight - height - 8, frame.y)) };
}

// Reused standalone image-window interaction model. Presentation only; no product imports.
export function ImageViewer({ src, alt, title = 'Image view', caption, toolbar, viewport, mediaClassName = '', onClose }: ImageViewerProps) {
  const { t } = useLanguage();
  const headingId = useId();
  const dialog = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const imageSize = useRef({ width: 0, height: 0 });
  const fitting = useRef(true);
  const camera = useRef<Camera>({ x: 0, y: 0, scale: 1 });
  const [view, setView] = useState(camera.current);
  const [frame, setFrame] = useState(() => contain({ x: (window.innerWidth - 900) / 2,
    y: (window.innerHeight - 650) / 2, width: 900, height: 650 }));
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [dragging, setDragging] = useState(false);
  const pointers = useRef(new Map<number, Point>());
  const windowDrag = useRef<{ id: number; kind: 'move' | 'resize'; start: Point; frame: Frame } | null>(null);

  function commit(next: Camera) { camera.current = next; setView(next); }
  function fit() {
    fitting.current = true;
    const node = stage.current, image = imageSize.current;
    if (!node || !image.width) return;
    const scale = limitScale(Math.min((node.clientWidth - 24) / image.width, (node.clientHeight - 24) / image.height, 4));
    commit({ scale, x: (node.clientWidth - image.width * scale) / 2, y: (node.clientHeight - image.height * scale) / 2 });
  }
  function zoom(factor: number, point?: Point) {
    const node = stage.current;
    if (!node || !imageSize.current.width) return;
    fitting.current = false;
    const anchor = point ?? { x: node.clientWidth / 2, y: node.clientHeight / 2 };
    const held = camera.current, scale = limitScale(held.scale * factor), ratio = scale / held.scale;
    commit({ scale, x: anchor.x - (anchor.x - held.x) * ratio, y: anchor.y - (anchor.y - held.y) * ratio });
  }
  function local(clientX: number, clientY: number): Point {
    const rect = stage.current!.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.focus();
    const resize = () => setFrame((held) => contain(held));
    window.addEventListener('resize', resize);
    return () => { window.removeEventListener('resize', resize); if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);

  useEffect(() => {
    const node = stage.current!;
    let width = node.clientWidth, height = node.clientHeight, gestureScale = 1, gesturing = false;
    const observer = new ResizeObserver(() => {
      if (fitting.current) fit();
      else commit({ ...camera.current, x: camera.current.x + (node.clientWidth - width) / 2,
        y: camera.current.y + (node.clientHeight - height) / 2 });
      width = node.clientWidth; height = node.clientHeight;
    });
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      if (gesturing) return;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node.clientHeight : 1;
      const speed = event.ctrlKey || event.metaKey ? 0.01 : 0.002;
      zoom(Math.exp(-event.deltaY * unit * speed), local(event.clientX, event.clientY));
    };
    // Safari emits gesture events; Chromium/Firefox trackpad pinch arrives as Ctrl+wheel.
    type Gesture = Event & { scale: number; clientX: number; clientY: number };
    const gestureStart = (event: Event) => { event.preventDefault(); gesturing = true; gestureScale = (event as Gesture).scale || 1; };
    const gestureChange = (event: Event) => {
      event.preventDefault();
      const next = event as Gesture;
      if (next.scale > 0) {
        zoom(next.scale / gestureScale, Number.isFinite(next.clientX) && Number.isFinite(next.clientY) ? local(next.clientX, next.clientY) : undefined);
        gestureScale = next.scale;
      }
    };
    const gestureEnd = (event: Event) => { event.preventDefault(); gesturing = false; };
    observer.observe(node);
    node.addEventListener('wheel', wheel, { passive: false });
    node.addEventListener('gesturestart', gestureStart, { passive: false });
    node.addEventListener('gesturechange', gestureChange, { passive: false });
    node.addEventListener('gestureend', gestureEnd, { passive: false });
    return () => {
      observer.disconnect(); node.removeEventListener('wheel', wheel);
      node.removeEventListener('gesturestart', gestureStart); node.removeEventListener('gesturechange', gestureChange);
      node.removeEventListener('gestureend', gestureEnd);
    };
  }, []);

  // A new source is fitted once, never left under the previous image's transform.
  useEffect(() => { imageSize.current = { width: 0, height: 0 }; fitting.current = true; setStatus('loading'); }, [src]);

  function startWindowDrag(event: ReactPointerEvent<HTMLElement>, kind: 'move' | 'resize') {
    if (event.button !== 0 || (kind === 'move' && (event.target as Element).closest('button'))) return;
    event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId);
    windowDrag.current = { id: event.pointerId, kind, start: { x: event.clientX, y: event.clientY }, frame };
  }
  function moveWindow(event: ReactPointerEvent<HTMLElement>) {
    const held = windowDrag.current;
    if (!held || held.id !== event.pointerId) return;
    const dx = event.clientX - held.start.x, dy = event.clientY - held.start.y;
    setFrame(contain(held.kind === 'move' ? { ...held.frame, x: held.frame.x + dx, y: held.frame.y + dy }
      : { ...held.frame, width: held.frame.width + dx, height: held.frame.height + dy }));
  }
  function stopWindow(event: ReactPointerEvent<HTMLElement>) {
    if (windowDrag.current?.id === event.pointerId) windowDrag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function stopPan(event: ReactPointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId); setDragging(pointers.current.size > 0);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return createPortal(<section className="image-viewer" role="dialog" aria-modal="false" aria-labelledby={headingId}
    ref={dialog} tabIndex={-1} style={{ left: frame.x, top: frame.y, width: frame.width, height: frame.height }}
    onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
    <header className="image-viewer-title" tabIndex={0} aria-label={t("Move image window")}
      title={t("Drag to move · Arrow keys move the window")}
      onPointerDown={(event) => startWindowDrag(event, 'move')} onPointerMove={moveWindow}
      onPointerUp={stopWindow} onPointerCancel={stopWindow} onLostPointerCapture={stopWindow}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget || !event.key.startsWith('Arrow')) return;
        event.preventDefault(); const step = event.shiftKey ? 40 : 10;
        setFrame((held) => contain({ ...held, x: held.x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0),
          y: held.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0) }));
      }}>
      <strong id={headingId}>{t(title)}</strong>
      <button type="button" aria-label={t("Close image view")} title={t("Close · Escape")} onClick={onClose}>×</button>
    </header>
    <div className="image-viewer-tools">
      {toolbar}
      <button type="button" onClick={fit} disabled={status !== 'ready'}>{t("Fit")}</button>
      <button type="button" onClick={() => zoom(1 / camera.current.scale)} disabled={status !== 'ready'}>100%</button>
      <button type="button" aria-label={t("Zoom out")} onClick={() => zoom(1 / 1.25)} disabled={status !== 'ready'}>−</button>
      <output aria-label={t("Image zoom")}>{Math.round(view.scale * 100)}%</output>
      <button type="button" aria-label={t("Zoom in")} onClick={() => zoom(1.25)} disabled={status !== 'ready'}>+</button>
      <span>{t("Scroll to zoom · Press and drag to pan")}</span>
    </div>
    <div className={`image-viewer-stage${dragging ? ' is-dragging' : ''}`} ref={stage} tabIndex={0}
      aria-label={t("Image pan and zoom")} onDoubleClick={fit}
      onKeyDown={(event) => {
        if (event.key === '+' || event.key === '=' || event.key === '-') { event.preventDefault(); zoom(event.key === '-' ? 1 / 1.25 : 1.25); }
        if (event.key === '0') { event.preventDefault(); fit(); }
        if (event.key.startsWith('Arrow')) {
          event.preventDefault(); fitting.current = false;
          commit({ ...camera.current, x: camera.current.x + (event.key === 'ArrowRight' ? -40 : event.key === 'ArrowLeft' ? 40 : 0),
            y: camera.current.y + (event.key === 'ArrowDown' ? -40 : event.key === 'ArrowUp' ? 40 : 0) });
        }
      }}
      onPointerDown={(event) => {
        if (event.button !== 0 && event.button !== 1) return;
        event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId);
        pointers.current.set(event.pointerId, local(event.clientX, event.clientY)); setDragging(true);
      }}
      onPointerMove={(event) => {
        const before = [...pointers.current.values()], held = pointers.current.get(event.pointerId);
        if (!held) return;
        const point = local(event.clientX, event.clientY); pointers.current.set(event.pointerId, point); fitting.current = false;
        if (before.length < 2) commit({ ...camera.current, x: camera.current.x + point.x - held.x, y: camera.current.y + point.y - held.y });
        else {
          const after = [...pointers.current.values()];
          const distance = (points: Point[]) => Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
          const center = (points: Point[]) => ({ x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 });
          const prev = center(before), next = center(after), scale = limitScale(camera.current.scale * distance(after) / Math.max(1, distance(before)));
          const ratio = scale / camera.current.scale;
          commit({ scale, x: next.x - (prev.x - camera.current.x) * ratio, y: next.y - (prev.y - camera.current.y) * ratio });
        }
      }} onPointerUp={stopPan} onPointerCancel={stopPan} onLostPointerCapture={stopPan}>
      <div className={`image-viewer-media ${mediaClassName}`} style={{ visibility: status === 'ready' ? 'visible' : 'hidden',
        width: imageSize.current.width, height: imageSize.current.height,
        transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>
        <img key={src} src={src} alt={alt} draggable={false}
          style={{ left: -(viewport?.x || 0), top: -(viewport?.y || 0) }}
          onLoad={(event) => {
            imageSize.current = { width: viewport?.width || event.currentTarget.naturalWidth, height: viewport?.height || event.currentTarget.naturalHeight };
            setStatus('ready'); fit();
          }} onError={() => setStatus('error')} />
      </div>
      {status !== 'ready' && <p className="image-viewer-message" role={status === 'error' ? 'alert' : 'status'}>
        {t(status === 'error' ? 'Could not load this image. Close and reopen to retry.' : 'Loading image…')}</p>}
    </div>
    <footer className="image-viewer-footer">
      <small>{caption || t('Image view · changes here do not edit the source.')}</small>
      <button type="button" className="image-viewer-resize" aria-label={t("Resize image window")} title={t("Drag to resize · Arrow keys resize")}
        onPointerDown={(event) => startWindowDrag(event, 'resize')} onPointerMove={moveWindow}
        onPointerUp={stopWindow} onPointerCancel={stopWindow} onLostPointerCapture={stopWindow}
        onKeyDown={(event) => {
          if (!event.key.startsWith('Arrow')) return;
          event.preventDefault(); const step = event.shiftKey ? 40 : 10;
          setFrame((held) => contain({ ...held, width: held.width + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0),
            height: held.height + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0) }));
        }}>◢</button>
    </footer>
  </section>, document.body);
}
