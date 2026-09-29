import type { Publication } from '../shared/citations';

/** Our research as three empires. Each one is a lane of the city; the timeline runs along it. */
export type EmpireId = 'circuit' | 'signal' | 'drone';
export const empireIds: EmpireId[] = ['circuit', 'signal', 'drone'];
export const laneX: Record<EmpireId, number> = { circuit: -40, signal: 0, drone: 40 };

type Paper = Pick<Publication, 'title' | 'keywords'>;
const text = (paper: Paper) => [paper.title, ...paper.keywords].join(' ');

/** Drones first (UAVs, swarms, autonomous vehicles), then signals (radar, waveforms, time series); the rest are circuits. */
export function empireOf(paper: Paper): EmpireId {
  if (/\bUAVs?\b|drone|swarm|autonomous vehicle|multi-agent/i.test(text(paper))) return 'drone';
  if (/radar|pulse compression|time.series|time-frequency/i.test(text(paper))) return 'signal';
  return 'circuit';
}

/** The picture on top of each building: a symbol for what the paper is about. */
export type Glyph = 'phase' | 'bidirectional' | 'mixer' | 'switch' | 'distributed' | 'gain' | 'amplifier' | 'spectrogram'
  | 'chirp' | 'grid' | 'field' | 'chain' | 'transformer' | 'dots' | 'survey' | 'medical' | 'leaf' | 'agents' | 'coverage'
  | 'relay' | 'priority' | 'sensing' | 'search' | 'stack' | 'bayes' | 'pixels' | 'ports' | 'book' | 'chip';
const glyphs: [RegExp, Glyph][] = [
  [/phase shifter/i, 'phase'], [/bidirectional/i, 'bidirectional'], [/mixer/i, 'mixer'], [/SPDT|switch/i, 'switch'],
  [/distributed amplifier/i, 'distributed'], [/variable gain/i, 'gain'], [/low.noise|\bLNA\b/i, 'amplifier'],
  [/\bLPI\b|classif/i, 'spectrogram'], [/pulse compression/i, 'chirp'], [/power system|stability/i, 'grid'],
  [/agriculture/i, 'field'], [/blockchain/i, 'chain'], [/flyback/i, 'transformer'], [/quantum dot/i, 'dots'],
  [/survey/i, 'survey'], [/medical/i, 'medical'], [/sustainab/i, 'leaf'], [/heterogeneous/i, 'agents'],
  [/coverage/i, 'coverage'], [/connectivity|relay/i, 'relay'], [/priority/i, 'priority'], [/sensing-aware/i, 'sensing'],
  [/search/i, 'search'], [/multi-layer pixelated/i, 'stack'], [/bayesian/i, 'bayes'], [/pixelated/i, 'pixels'], [/synthesis/i, 'ports'], [/education/i, 'book'],
];
export const glyphOf = (paper: Paper): Glyph => glyphs.find(([pattern]) => pattern.test(text(paper)))?.[1] ?? 'chip';

/** Stable per-paper variation (FNV-1a), so every visit shows the same city. */
export function seedOf(id: string) {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  return hash >>> 0;
}

export type Building = {
  paper: Publication; empire: EmpireId; glyph: Glyph; seed: number;
  x: number; z: number; side: -1 | 1; height: number; radius: number;
};
export type CityLayout = { buildings: Building[]; years: { year: number; z: number; papers: number }[]; startZ: number; endZ: number; genesisZ: number };

/** One building per paper. Years follow each other along -z; a year gets room for its busiest lane, empty years stay short. */
export function layoutCity(papers: Publication[]): CityLayout {
  const first = Math.min(...papers.map(paper => paper.year)), last = Math.max(...papers.map(paper => paper.year));
  const buildings: Building[] = [], years: CityLayout['years'] = [];
  let z = 0;
  for (let year = first; year <= last; year++) {
    const inYear = papers.filter(paper => paper.year === year).sort((a, b) => a.id.localeCompare(b.id));
    const lanes = empireIds.map(empire => inYear.filter(paper => empireOf(paper) === empire));
    years.push({ year, z, papers: inYear.length });
    lanes.forEach((list, lane) => list.forEach((paper, index) => {
      const empire = empireIds[lane], seed = seedOf(paper.id);
      const side: -1 | 1 = (index + lane + year) % 2 ? 1 : -1;
      const height = paper.type === 'Journal' ? 17 + (seed % 8) : 10 + (seed % 7);
      buildings.push({ paper, empire, glyph: glyphOf(paper), seed, x: laneX[empire] + side * 10, z: z - 10 - index * 11, side, height, radius: empire === 'signal' ? 4.2 : 4.6 });
    }));
    const busiest = Math.max(...lanes.map(list => list.length));
    z -= busiest ? 16 + busiest * 11 : 14;
  }
  return { buildings, years, startZ: 24, endZ: z, genesisZ: z - 40 };
}
