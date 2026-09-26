import { useRef, useState } from 'react';
import { Icon } from './ui';
import { publicationUrl, type Publication } from './citations';
import { PublicationActions } from './PublicationActions';
import '../styles/publications.css';

type Researcher = { id: string; name: string; scholar: string };
/** Static, supplied content only. No scholarly service or product connection. */
export function Publications({ people, papers }: { people: Researcher[]; papers: Publication[] }) {
  const [open, setOpen] = useState(false);
  const [person, setPerson] = useState('all');
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [limit, setLimit] = useState(6);
  const heading = useRef<HTMLHeadingElement>(null);
  const normalize = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const matching = papers.filter(paper => (person === 'all' || paper.people.includes(person))
    && (kind === 'all' || paper.type === kind)
    && normalize([paper.title, paper.authors, paper.venue, ...paper.keywords].join(' ')).includes(normalize(query.trim())))
    .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));

  return <div className="research-details">
    <button className="research-toggle" aria-expanded={open} aria-controls="research-publications" onClick={() => setOpen(value => !value)}>
      <span><Icon name="document" /><span>Details & publications<small>{papers.length} published papers · {Math.min(...papers.map(p => p.year))}–{Math.max(...papers.map(p => p.year))}</small></span></span>
      <Icon name={open ? 'close' : 'arrow'} />
    </button>
    {open && <section id="research-publications" className="research-library" aria-labelledby="research-heading">
      <div className="research-intro"><div><p className="eyebrow">THE RESEARCH BEHIND GENESIS</p><h3 id="research-heading" ref={heading} tabIndex={-1}>Ideas, tested and published.</h3></div><p>RF circuits, optimization and autonomous systems.<br />Journal and conference publications, without preprints.</p></div>
      <div className="research-filters">
        <div className="research-people" role="group" aria-label="Filter publications by author">
          {[{ id: 'all', name: 'Everyone' }, ...people].map(author => <button key={author.id} aria-pressed={person === author.id} onClick={() => { setPerson(author.id); setLimit(6); }}>{author.name}<span>{papers.filter(p => author.id === 'all' || p.people.includes(author.id)).length}</span></button>)}
        </div>
        <div className="research-search"><label>Search publications<input type="search" value={query} placeholder="Title, keyword or author" onChange={event => { setQuery(event.target.value); setLimit(6); }} /></label><label>Publication type<select value={kind} onChange={event => { setKind(event.target.value); setLimit(6); }}><option value="all">All publications</option><option value="Journal">Journal articles</option><option value="Conference">Conference papers</option></select></label></div>
      </div>
      <div className="research-meta"><p role="status">{matching.length} {matching.length === 1 ? 'publication' : 'publications'}</p><div>{people.filter(author => person === 'all' || author.id === person).map(author => <a key={author.id} href={author.scholar} target="_blank" rel="noopener noreferrer">{author.name} on Scholar <Icon name="diagonal" /></a>)}</div></div>
      <div className="publication-list">
        {matching.slice(0, limit).map(paper => <article className="publication-card" key={paper.id}>
          <div className="publication-year"><span>{paper.year}</span><small>{paper.type}</small></div>
          <div className="publication-body"><p className="publication-venue">{paper.venue}</p><h4><a href={publicationUrl(paper)} target="_blank" rel="noopener noreferrer">{paper.title}<Icon name="diagonal" /></a></h4><p className="publication-authors">{paper.authors}</p>
            <ul className="publication-keywords" aria-label="Editorial keywords">{paper.keywords.map(keyword => <li key={keyword}>{keyword}</li>)}</ul>
            <details className="publication-abstract"><summary>Abstract {paper.summary ? 'summary' : '& source'}</summary>{paper.summary ? <p>{paper.summary}</p> : <p>The abstract could not be verified for this record. The publication record is linked below.</p>}<div className="publication-links"><a href={publicationUrl(paper)} target="_blank" rel="noopener noreferrer">{paper.doi ? 'Read publication' : 'Publication record'} <Icon name="diagonal" /></a>{paper.summary && paper.source !== publicationUrl(paper) && <a href={paper.source} target="_blank" rel="noopener noreferrer">Abstract source <Icon name="diagonal" /></a>}</div></details>
            <PublicationActions paper={paper} />
          </div>
        </article>)}
      </div>
      {!matching.length && <p className="research-empty">No publications match these filters. Try another keyword or author.</p>}
      {matching.length > limit && <button className="button button-secondary research-more" onClick={() => setLimit(value => value + 6)}>Show more publications <span>{matching.length - limit} remaining</span><Icon name="down" /></button>}
      <p className="research-note">Abstracts are editorial summaries, not verbatim reproductions. Keywords are editorial topic labels. Publication links lead to the original records. Verified 26 September 2026.</p>
      <button className="research-back" onClick={() => { setLimit(6); heading.current?.focus(); heading.current?.scrollIntoView({ block: 'start', behavior: 'instant' }); }}>Back to filters <Icon name="arrow" /></button>
    </section>}
  </div>;
}
