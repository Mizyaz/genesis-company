import { useEffect, useState, type RefObject } from 'react';

/** Where you are in a row of cards that scrolls sideways on phones (`.swipe-row` in site.css); a dot brings its card
 * into view. Hidden on wider screens, where the row is a grid. A pointer aid only: keyboards and screen readers reach
 * the cards themselves. */
export function SwipeDots({ row, count }: { row: RefObject<HTMLElement | null>; count: number }) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const element = row.current;
    if (!element) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const cards = [...element.children] as HTMLElement[];
      if (!cards.length) return;
      const start = element.getBoundingClientRect().left + parseFloat(getComputedStyle(element).paddingLeft);
      const away = (card: HTMLElement) => Math.abs(card.getBoundingClientRect().left - start);
      const nearest = cards.reduce((best, card, i) => away(card) < away(cards[best]) ? i : best, 0);
      // The last card cannot reach the start of the row: at the end of the row, it is the one in view.
      const end = element.scrollLeft > 0 && element.scrollLeft + element.clientWidth >= element.scrollWidth - 2;
      setCurrent(end ? cards.length - 1 : nearest);
    };
    const scrolled = () => { if (!frame) frame = requestAnimationFrame(update); };
    element.addEventListener('scroll', scrolled, { passive: true });
    window.addEventListener('resize', scrolled);
    update();
    return () => { element.removeEventListener('scroll', scrolled); window.removeEventListener('resize', scrolled); cancelAnimationFrame(frame); };
  }, [row, count]);
  const show = (index: number) => {
    const element = row.current, card = element?.children[index];
    if (!element || !(card instanceof HTMLElement)) return;
    const left = element.scrollLeft + card.getBoundingClientRect().left - element.getBoundingClientRect().left - parseFloat(getComputedStyle(element).paddingLeft);
    element.scrollTo({ left, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  return <div className="swipe-dots" aria-hidden="true">{Array.from({ length: count }, (_, i) =>
    <button key={i} type="button" tabIndex={-1} data-current={i === current} onClick={() => show(i)} />)}</div>;
}
