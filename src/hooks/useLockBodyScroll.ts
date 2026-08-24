import { useLayoutEffect } from 'react';

/**
 * Pins the body in place while `locked` is true instead of just hiding the scrollbar
 * (overflow:hidden alone still lets wheel/touch events reach the page behind a fixed
 * overlay). That live scroll is what desyncs a `fixed` + `backdrop-filter` modal from
 * the viewport on scroll, in a way overflow:hidden doesn't prevent — this fixed+negative
 * top trick is the standard cross-browser fix, including iOS Safari.
 *
 * Several of these modals can be open at once (e.g. editing an expense while its detail
 * view is still mounted underneath), so a shared counter tracks how many callers currently
 * want the lock — only the first lock captures scroll position and applies it, and only the
 * last release restores it, so nested/overlapping modals never fight over body styles.
 */
let lockCount = 0;
let savedScrollY = 0;

export function useLockBodyScroll(locked: boolean): void {
  useLayoutEffect(() => {
    if (!locked) return;

    if (lockCount === 0) {
      savedScrollY = window.scrollY;
      const { style } = document.body;
      style.position = 'fixed';
      style.top = `-${savedScrollY}px`;
      style.width = '100%';
    }
    lockCount += 1;

    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        const { style } = document.body;
        style.position = '';
        style.top = '';
        style.width = '';
        window.scrollTo(0, savedScrollY);
      }
    };
  }, [locked]);
}
