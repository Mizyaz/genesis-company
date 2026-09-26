/** Pure formatting helpers for the site's bundled publication records. */
export type Publication = {
  id: string; title: string; authors: string; people: string[]; year: number;
  venue: string; type: string; doi: string; keywords: string[];
  summary: string | null; source: string;
  citation: { authors: string[]; venue: string; volume?: string; number?: string; pages?: string };
  openAccess?: { url: string; source: string; version: string; verifiedOn: string };
};

export const publicationUrl = (paper: Publication) => paper.doi ? `https://doi.org/${paper.doi}` : paper.source;

export function citationText(paper: Publication) {
  const { venue, volume, number, pages } = paper.citation;
  const location = [venue, volume ? volume + (number ? `(${number})` : '') : '', pages].filter(Boolean).join(', ');
  return `${paper.authors} (${paper.year}). ${paper.title}. ${location}. ${publicationUrl(paper)}`;
}

function bibEscape(text: string) {
  const replacements: Record<string, string> = {
    '\\': '\\textbackslash{}', '{': '\\{', '}': '\\}', '&': '\\&', '%': '\\%',
    '$': '\\$', '#': '\\#', '_': '\\_', '~': '\\textasciitilde{}', '^': '\\textasciicircum{}',
  };
  return text.replace(/[\\{}&%$#_~^]/g, char => replacements[char]);
}

export function bibtex(paper: Publication) {
  const { authors, venue, volume, number, pages } = paper.citation;
  const fields = [
    ['author', authors.join(' and ')], ['title', paper.title],
    [paper.type === 'Journal' ? 'journal' : 'booktitle', venue], ['year', String(paper.year)],
    ['volume', volume], ['number', number], ['pages', pages?.replace(/[-–]+/g, '--')],
    ['doi', paper.doi], ['url', publicationUrl(paper)],
  ].filter((field): field is [string, string] => Boolean(field[1]));
  const key = paper.id.replace(/[^a-zA-Z0-9_-]/g, '');
  return '@' + (paper.type === 'Journal' ? 'article' : 'inproceedings') + '{' + key + ',\n'
    + fields.map(([name, value]) => '  ' + name + ' = {' + (name === 'title' ? '{' + bibEscape(value) + '}' : bibEscape(value)) + '}').join(',\n')
    + '\n}\n';
}
