import { useLanguage } from '../Language';
import { Icon } from '../ui';
import { ease } from './timeline';
import { llmClickAt, requestState } from './receiverScene';

/** A depicted interaction in the film, not an interactive assistant or a network request. */
export function RequestSequence({ time, prompt }: { time: number; prompt: string }) {
  const { t } = useLanguage();
  const phase = requestState(time), approaching = ease(.9, llmClickAt, time);
  const pressed = Math.sin(ease(llmClickAt, 2.4, time) * Math.PI);
  const status = phase === 'request' ? 'Send to GENESIS' : phase === 'pressed' ? 'Request received' : phase === 'thinking' ? 'Thinking' : 'Circuit assembled';
  return <div className="film-request" data-phase={phase} aria-label={t('Illustrated LLM interaction')}>
    {time < 5 && <p className="film-request-text" aria-label={prompt}><span aria-hidden="true">{prompt.slice(0, Math.ceil(ease(.2, 1.2, time) * prompt.length))}</span></p>}
    <div className="film-request-row">
      <span className="film-llm" style={{ transform: `scale(${1 - pressed * .06})` }}><Icon name="chip" /><span className="film-request-brand"><strong>GENESIS</strong><small lang="en" style={{ opacity: ease(.45, 1.1, time) }}>Generative Evolution of Silicon Intelligent Systems</small></span><span>LLM</span>
        <svg className="film-request-cursor" viewBox="0 0 20 28" aria-hidden="true" style={{ opacity: ease(.8, 1, time) * (1 - ease(2.4, 2.7, time)), transform: `translate(${(1 - approaching) * 50}px, ${(1 - approaching) * 26}px)` }}><path d="M2 2V21L7 16L12 26L16 24L11 14H19Z" /></svg>
      </span>
      <span className="film-request-status"><span>{t(status)}</span><span className="film-thinking-dots" aria-hidden="true">{[0, 1, 2].map(i => <i key={i} style={{ opacity: phase === 'thinking' ? .25 + .75 * Math.sin(time * 4 - i * .7) ** 2 : 0 }} />)}</span></span>
    </div>
  </div>;
}
