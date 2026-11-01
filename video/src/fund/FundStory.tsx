import { useLayoutEffect, useRef } from 'react';
import { AbsoluteFill } from 'remotion';
import { Story, type StoryProps } from '../Story';
import { watchPlainWords } from './plainWords';

/** The story film in the fund film's plain words: fund.mjs cuts its product part from this render. */
export function FundStory(props: StoryProps) {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => root.current ? watchPlainWords(root.current) : undefined, []);
  return <AbsoluteFill ref={root}><Story {...props} /></AbsoluteFill>;
}
