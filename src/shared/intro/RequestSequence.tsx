import { useLanguage } from '../Language';
import { ease } from './timeline';
import { llmClickAt, requestState } from './frontEndScene';

/** A depicted prompt, not a service connection. Branding is reserved for the end card. */
export function RequestSequence({ time, prompt }: { time: number; prompt: string }) {
  const { t } = useLanguage(), phase = requestState(time);
  const press = Math.sin(ease(llmClickAt, 2.35, time) * Math.PI);
  return <div className="film-request" data-phase={phase} aria-label={t('Illustrated LLM interaction')}
    style={{ opacity: ease(0, .4, time) * (1 - ease(2.6, 3.2, time)), transform: `translateY(${(1 - ease(0, .6, time)) * 20}px) scale(${1 + .025 * ease(2.5, 3.2, time)})` }}>
    <div className="film-prompt-glow" aria-hidden="true" />
    <div className="film-prompt-field">
      <p aria-label={prompt}><span aria-hidden="true">{prompt.slice(0, Math.ceil(ease(.15, 1.7, time) * prompt.length))}</span><i className="film-type-caret" aria-hidden="true" style={{ opacity: time < 2.1 ? 1 : 0 }} /></p>
      <span className="film-send" style={{ transform: `scale(${1 - press * .12})` }} aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 19V5m-6 6 6-6 6 6" /></svg></span>
      <svg className="film-request-cursor" viewBox="0 0 20 28" aria-hidden="true" style={{ opacity: ease(1.5, 1.7, time) * (1 - ease(2.25, 2.5, time)), transform: `translate(${(1 - ease(1.5, 2.1, time)) * 65}px, ${(1 - ease(1.5, 2.1, time)) * 35}px)` }}><path d="M2 2V21L7 16L12 26L16 24L11 14H19Z" /></svg>
    </div>
    <div className="film-request-status" style={{ opacity: ease(2.25, 2.5, time) }}><span>{t('Thinking')}</span><span className="film-thinking-dots" aria-hidden="true">{[0, 1, 2].map(i => <i key={i} style={{ opacity: .25 + .75 * Math.sin(time * 6 - i * .7) ** 2 }} />)}</span></div>
  </div>;
}
