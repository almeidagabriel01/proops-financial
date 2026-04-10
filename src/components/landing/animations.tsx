'use client';

import { useEffect } from 'react';

export function AnimationObserver() {
  useEffect(() => {
    // Fade-up animation for [data-animate] elements
    const fadeObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            fadeObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' },
    );

    document.querySelectorAll('[data-animate]').forEach((el) => {
      fadeObserver.observe(el);
    });

    // Counter animation for [data-counter] elements
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const target = parseInt(el.dataset.counter ?? '0', 10);
          const duration = 1400;
          const start = performance.now();

          function tick(now: number) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(eased * target);
            el.textContent = current.toLocaleString('pt-BR');
            if (progress < 1) requestAnimationFrame(tick);
          }

          requestAnimationFrame(tick);
          counterObserver.unobserve(el);
        });
      },
      { threshold: 0.5 },
    );

    document.querySelectorAll('[data-counter]').forEach((el) => {
      counterObserver.observe(el);
    });

    return () => {
      fadeObserver.disconnect();
      counterObserver.disconnect();
    };
  }, []);

  return null;
}
