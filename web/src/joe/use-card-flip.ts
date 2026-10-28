import { useEffect, useRef, useState, type RefObject } from 'react';
import { useAnimationControls, useReducedMotion } from 'motion/react';

export function useCardFlip(expanded: boolean, card: RefObject<HTMLElement | null>, onClosed: () => void) {
  const controls = useAnimationControls();
  const reduced = useReducedMotion();
  const [layoutExpanded, setLayoutExpanded] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const layout = useRef(false);
  const previousFocus = useRef<HTMLElement | null>(null);
  const restoreFocus = useRef(false);

  useEffect(() => {
    let cancelled = false;
    if (expanded === layout.current) {
      controls.set({ rotateY: 0, opacity: 1 });
      setFlipping(false);
      if (!expanded) onClosed();
      return;
    }
    setFlipping(true);
    async function flip() {
      await controls.start(reduced ? { opacity: 0, transition: { duration: 0.08 } } : { rotateY: 90, transition: { duration: 0.25, ease: 'easeIn' } });
      if (cancelled) return;
      layout.current = expanded;
      setLayoutExpanded(expanded);
      controls.set(reduced ? { opacity: 0, rotateY: 0 } : { rotateY: -90 });
      await controls.start(reduced ? { opacity: 1, transition: { duration: 0.12 } } : { rotateY: 0, transition: { duration: 0.25, ease: 'easeOut' } });
      if (cancelled) return;
      if (!expanded) onClosed();
      restoreFocus.current = true;
      setFlipping(false);
    }
    void flip();
    return () => { cancelled = true; controls.stop(); };
  }, [expanded, controls, reduced, card, onClosed]);

  useEffect(() => {
    if (flipping || !restoreFocus.current) return;
    restoreFocus.current = false;
    if (layoutExpanded) card.current?.querySelector<HTMLButtonElement>('[data-close-card]')?.focus({ preventScroll: true });
    else if (previousFocus.current?.isConnected && previousFocus.current !== document.body) previousFocus.current.focus({ preventScroll: true });
    else card.current?.focus({ preventScroll: true });
  }, [flipping, layoutExpanded, card]);

  function rememberFocus() {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }

  return { controls, reduced, layoutExpanded, flipping, rememberFocus };
}
