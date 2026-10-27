import { useEffect, useRef, useState } from 'react';
import { assetUrl, Icon } from './ui';
import '../styles/film.css';

export type FilmContent = { watch: string; close: string; label: string; src: string; poster: string };

/** The film, served from the site: a button opens it full width over the page with the browser's own controls; closing
 * it (the button, Escape or a click beside it) stops it. */
export function FilmPlayer({ content }: { content: FilmContent }) {
  const dialog = useRef<HTMLDialogElement>(null), video = useRef<HTMLVideoElement>(null), [open, setOpen] = useState(false);
  useEffect(() => {
    const box = dialog.current;
    if (!box) return;
    const closed = () => { video.current?.pause(); setOpen(false); };
    box.addEventListener('close', closed);
    return () => box.removeEventListener('close', closed);
  }, []);
  const show = () => { dialog.current?.showModal(); setOpen(true); void video.current?.play().catch(() => undefined); };
  return <>
    <button type="button" className="button button-secondary film-watch" onClick={show}><Icon name="play" />{content.watch}</button>
    <dialog ref={dialog} className="film-dialog" aria-label={content.label} onClick={event => { if (event.target === dialog.current) dialog.current.close(); }}>
      <div className="film-frame">
        <video ref={video} src={assetUrl(content.src)} poster={assetUrl(content.poster)} controls playsInline preload={open ? 'auto' : 'none'} />
        <button type="button" className="film-close" aria-label={content.close} onClick={() => dialog.current?.close()}><Icon name="close" /></button>
      </div>
    </dialog>
  </>;
}
