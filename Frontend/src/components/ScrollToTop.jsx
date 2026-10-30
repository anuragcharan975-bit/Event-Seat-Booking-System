import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Universal Mobile & Desktop ScrollToTop Component
 *
 * 1. Automatically resets window scroll to (0,0) on every route navigation.
 * 2. Overcomes mobile browser retention of scroll positions.
 * 3. Disables automatic browser scroll restoration (history.scrollRestoration = 'manual').
 * 4. Ensures the top header and hero banner are immediately visible when pages load.
 * 5. Uses multi-stage scroll resets (instant layoutEffect, requestAnimationFrame, and post-Suspense timer).
 */
const ScrollToTop = () => {
  const { pathname, search, hash } = useLocation();

  // 1. Globally disable browser automatic scroll restoration
  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      try {
        window.history.scrollRestoration = 'manual';
      } catch {
        // Fallback for environments with strict history sandbox
      }
    }

    // Force scroll to top on page refresh or direct URL open
    const handleInitialLoad = () => {
      if (!window.location.hash) {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
    };

    window.addEventListener('pageshow', handleInitialLoad);
    window.addEventListener('load', handleInitialLoad);

    return () => {
      window.removeEventListener('pageshow', handleInitialLoad);
      window.removeEventListener('load', handleInitialLoad);
    };
  }, []);

  // 2. Multi-stage scroll reset on route changes
  useLayoutEffect(() => {
    // If a hash anchor is provided (e.g. #reviews), let browser navigate to it
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }

    const resetScroll = () => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant'
      });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      // Also reset root container if it ever developed an internal scroll offset
      const root = document.getElementById('root');
      if (root && root.scrollTop > 0) {
        root.scrollTop = 0;
      }
      const main = document.querySelector('main');
      if (main && main.scrollTop > 0) {
        main.scrollTop = 0;
      }
    };

    // Stage 1: Immediate synchronous reset before browser paint
    resetScroll();

    // Stage 2: Reset on the next animation frame (after layout computation)
    const rafId = requestAnimationFrame(() => {
      resetScroll();
    });

    // Stage 3: Post-render safeguard for React.lazy chunks and dynamic images
    const timerId = setTimeout(() => {
      resetScroll();
    }, 60);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
    };
  }, [pathname, search, hash]);

  return null;
};

export default ScrollToTop;
