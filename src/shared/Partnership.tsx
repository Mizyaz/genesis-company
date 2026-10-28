import { useState, type FormEvent } from 'react';
import { Icon, SectionHeading } from './ui';
import '../styles/partnership.css';

type Track = { id: string; icon: string; title: string; detail: string };
export type PartnershipContent = { eyebrow?: string; headline: string; accent: string; intro?: string; tracks: Track[]; action: string; note?: string };

/** The partnership sign-up: three ways to work with us beside a short form. The site has no server, so the form opens
 * the visitor's mail app with the fields filled in. */
export function Partnership({ content, email }: { content: PartnershipContent; email: string }) {
  const [track, setTrack] = useState(content.tracks[0].id);
  function signUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const field = (name: string) => String(new FormData(event.currentTarget).get(name) ?? '').trim();
    const chosen = content.tracks.find(item => item.id === track)!;
    const body = [`Name: ${field('name')}`, `Organization: ${field('organization')}`, `Email: ${field('email')}`, `Partnership: ${chosen.title}`, '', field('message')].join('\n');
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(`GENESIS partnership: ${chosen.title}`)}&body=${encodeURIComponent(body)}`;
  }
  return <section id="partnership" className="content-section partnership-section" aria-labelledby="partnership-title">
    <div className="partnership-copy">
      <SectionHeading eyebrow={content.eyebrow}><span id="partnership-title">{content.headline}<br /><span className="gradient-text">{content.accent}</span></span></SectionHeading>
      {content.intro && <p>{content.intro}</p>}
      <ul className="partnership-tracks">{content.tracks.map(item => <li key={item.id}>
        <button type="button" aria-pressed={track === item.id} onClick={() => setTrack(item.id)}>
          <Icon name={item.icon} /><span><strong>{item.title}</strong><small>{item.detail}</small></span>
        </button>
      </li>)}</ul>
    </div>
    <form className="partnership-form" onSubmit={signUp}>
      <label>Name<input name="name" autoComplete="name" required /></label>
      <label>Organization<input name="organization" autoComplete="organization" required /></label>
      <label>Email<input name="email" type="email" autoComplete="email" required /></label>
      <label>Partnership<select value={track} onChange={event => setTrack(event.target.value)}>{content.tracks.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      <label>What would you like to build?<textarea name="message" rows={3} /></label>
      <button className="button button-primary" type="submit">{content.action} <Icon name="arrow" /></button>
      {content.note && <p className="partnership-note">{content.note}</p>}
    </form>
  </section>;
}
