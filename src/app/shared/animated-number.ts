import { Signal, effect, signal, untracked } from '@angular/core';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Nombre affiché qui défile de sa valeur précédente vers `target()` (requestAnimationFrame, ralenti à la fin).
 * Purement visuel : la dernière image affiche EXACTEMENT la cible. Première valeur ou « réduire les animations » :
 * affichage immédiat. `null` = pas de valeur (on garde la précédente). À appeler dans un constructeur (contexte d'injection).
 */
export function animatedNumber(target: Signal<number | null>, durationMs = 600): Signal<number | null> {
  const value = signal<number | null>(untracked(target));

  effect((onCleanup) => {
    const to = target();
    if (to === null) return;
    const from = untracked(value);
    if (from === null || from === to || prefersReducedMotion()) {
      value.set(to);
      return;
    }
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now: number) {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      value.set(t === 1 ? to : from + (to - from) * eased);
      if (t < 1) frame = requestAnimationFrame(step);
    });
    // Nouvelle cible avant la fin : l'animation en cours s'arrête et repart de la valeur affichée
    onCleanup(() => cancelAnimationFrame(frame));
  });

  return value.asReadonly();
}
