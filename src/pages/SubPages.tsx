import site from '../content/site.json';
import { ProcessCards } from '../shared/ProcessCards';
import { mailto } from './OnePage';

const { process, collaboration } = site.home;

function Back() {
  return <a className="page-back" href="#/"><span aria-hidden="true">←</span> Back to the home page</a>;
}

/** Every step of the process on real designs, from their own records. */
export function ProcessPage() {
  return <main id="main" className="home sub-page">
    <section className="page-lead" aria-labelledby="process-title">
      <Back /><h1 id="process-title">{process.headline}</h1><p>{process.detail}</p>
    </section>
    <ProcessCards />
  </main>;
}

/** Who we work with and how a collaboration starts. No partner is named. */
export function CollaborationPage() {
  return <main id="main" className="home sub-page">
    <section className="page-lead" aria-labelledby="collaboration-title">
      <Back /><h1 id="collaboration-title">{collaboration.headline}</h1><p>{collaboration.intro}</p>
    </section>
    <ul className="collab-kinds">{collaboration.kinds.map(kind => <li key={kind.title}><h2>{kind.title}</h2><p>{kind.line}</p></li>)}</ul>
    <section className="collab-start" aria-labelledby="collab-start-title">
      <h2 id="collab-start-title">{collaboration.stepsTitle}</h2>
      <ol>{collaboration.steps.map(step => <li key={step}>{step}</li>)}</ol>
      <a className="button button-primary" href={mailto(collaboration.subject)}>{collaboration.action}</a>
    </section>
  </main>;
}
