import { useRef, useState } from 'react';
import { Icon } from './ui';
import { publicationUrl, type Publication } from './citations';
import { PublicationActions } from './PublicationActions';
import '../styles/publications.css';

type Researcher = { id: string; name: string; scholar: string };
/** Reusable library and reading pane. Static inputs, no router or service dependency. */
export function Publications({ people, papers }: { people: Researcher[]; papers: Publication[] }) {
  const [person, setPerson] = useState('all');
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [year, setYear] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const reader = useRef<HTMLElement>(null);
  const normalize = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const matching = papers.filter(paper => (person === 'all' || paper.people.includes(person))
    && (kind === 'all' || paper.type === kind) && (year === 'all' || String(paper.year) === year)
    && normalize([paper.title, paper.authors, paper.venue, ...paper.keywords].join(' ')).includes(normalize(query.trim())))
    .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
  const selected = matching.find(paper => paper.id === selectedId) ?? matching[0];
  const filtered = person !== 'all' || kind !== 'all' || year !== 'all' || query !== '';
  const reset = () => { setPerson('all'); setKind('all'); setYear('all'); setQuery(''); };
  const selectPaper = (id: string) => {
    setSelectedId(id);
    if (window.matchMedia('(max-width: 800px)').matches) window.requestAnimationFrame(() => {
      reader.current?.focus({ preventScroll: true });
      reader.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    });
  };

  return <section className="research-library" aria-label="Publication library">
    <div className="research-filters">
      <div className="research-people" role="group" aria-label="Filter publications by author">
        {[{ id: 'all', name: 'Everyone' }, ...people].map(author => <button key={author.id} aria-pressed={person === author.id} onClick={() => setPerson(author.id)}>{author.name}<span>{papers.filter(p => author.id === 'all' || p.people.includes(author.id)).length}</span></button>)}
      </div>
      <div className="research-search">
        <label>Search publications<input type="search" value={query} placeholder="Title, keyword or author" onChange={event => setQuery(event.target.value)} /></label>
        <label>Publication type<select value={kind} onChange={event => setKind(event.target.value)}><option value="all">All publications</option><option value="Journal">Journal articles</option><option value="Conference">Conference papers</option></select></label>
        <label>Year<select value={year} onChange={event => setYear(event.target.value)}><option value="all">All years</option>{[...new Set(papers.map(paper => paper.year))].sort((a, b) => b - a).map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      </div>
    </div>
    <div className="research-meta"><p role="status">{matching.length} {matching.length === 1 ? 'publication' : 'publications'} <span>· Newest first</span></p>{filtered && <button onClick={reset}>Clear filters <Icon name="close" /></button>}</div>
    {selected ? <div className="research-workspace">
      <nav className="publication-list" aria-label="Publications">
        {matching.map(paper => <button className="publication-item" key={paper.id} aria-current={selected.id === paper.id ? 'true' : undefined} aria-controls="publication-reader" onClick={() => selectPaper(paper.id)}>
          <span className="publication-item-meta"><span>{paper.year}</span><span>{paper.type}</span><Icon name="arrow" /></span>
          <span className="publication-item-title">{paper.title}</span><span className="publication-item-authors">{paper.authors}</span>
        </button>)}
      </nav>
      <article id="publication-reader" ref={reader} tabIndex={-1} className="publication-reader" aria-labelledby="publication-title">
        <div className="publication-reader-meta"><span>{selected.type} · {selected.year}</span><Icon name="document" /></div>
        <p className="publication-venue">{selected.venue}</p>
        <h2 id="publication-title">{selected.title}</h2>
        <p className="publication-authors">{selected.authors}</p>
        <ul className="publication-keywords" aria-label="Editorial keywords">{selected.keywords.map(keyword => <li key={keyword}>{keyword}</li>)}</ul>
        <section className="publication-abstract" aria-labelledby="abstract-heading"><h3 id="abstract-heading">Abstract summary</h3><p>{selected.summary ?? 'The abstract could not be verified for this record. Visit the publication record below.'}</p></section>
        <div className="publication-links"><a className="button button-primary" href={publicationUrl(selected)} target="_blank" rel="noopener noreferrer">Read publication <Icon name="diagonal" /></a>{selected.summary && selected.source !== publicationUrl(selected) && <a href={selected.source} target="_blank" rel="noopener noreferrer">Abstract source <Icon name="diagonal" /></a>}</div>
        <PublicationActions key={selected.id} paper={selected} />
        {selected.doi && <p className="publication-doi">DOI <span>{selected.doi}</span></p>}
      </article>
    </div> : <div className="research-empty"><Icon name="document" /><h2>No matching publications</h2><p>Try another keyword, author or year.</p><button className="button button-secondary" onClick={reset}>Clear filters</button></div>}
    <div className="research-sources"><span>More from our researchers</span>{people.map(author => <a key={author.id} href={author.scholar} target="_blank" rel="noopener noreferrer">{author.name} on Scholar <Icon name="diagonal" /></a>)}</div>
    <p className="research-note">Abstracts are editorial summaries, not verbatim reproductions. Keywords are editorial topic labels. Publication links lead to the original records. Verified 26 September 2026.</p>
  </section>;
}
