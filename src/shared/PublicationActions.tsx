import { useLanguage } from './Language';
import { useEffect, useRef, useState } from 'react';
import { bibtex, citationText, type Publication } from './citations';
import { Icon } from './ui';

/** Clipboard and file download only. No API calls or reference-manager dependency. */
export function PublicationActions({ paper }: { paper: Publication }) {
  const { t } = useLanguage();
  const [state, setState] = useState<'idle' | 'copied' | 'manual'>('idle');
  const fallback = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (state === 'manual') { fallback.current?.focus(); fallback.current?.select(); }
    if (state !== 'copied') return;
    const timer = window.setTimeout(() => setState('idle'), 2500);
    return () => window.clearTimeout(timer);
  }, [state]);
  async function copy() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(citationText(paper));
      setState('copied');
    } catch { setState('manual'); }
  }
  return <div className="publication-tools">
    <div className="publication-actions" role="group" aria-label={t('Publication tools for {title}', { title: paper.title })}>
      <button type="button" onClick={copy} aria-label={t('Copy citation for {title}', { title: paper.title })}><Icon name="document" />{t(state === 'copied' ? 'Copied' : 'Copy citation')}</button>
      <a href={`data:application/x-bibtex;charset=utf-8,${encodeURIComponent(bibtex(paper))}`} download={`${paper.id}.bib`} aria-label={t('Download BibTeX for {title}', { title: paper.title })}><Icon name="down" />{t("BibTeX")}</a>
      {paper.openAccess && <a className="publication-pdf" href={paper.openAccess.url} target="_blank" rel="noopener noreferrer"
        title={`${paper.openAccess.version} · ${paper.openAccess.source}`} aria-label={t('Open access PDF for {title}', { title: paper.title })}>{t("Open PDF")} <Icon name="diagonal" /></a>}
      <span className="visually-hidden" role="status">{state === 'copied' ? t('Citation copied to clipboard.') : ''}</span>
    </div>
    {state === 'manual' && <div className="citation-fallback"><label>{t("Automatic copying is unavailable. Select and copy this citation.")}<textarea ref={fallback} readOnly rows={4} value={citationText(paper)} /></label><button type="button" onClick={() => setState('idle')}>{t("Close")}</button></div>}
  </div>;
}
