import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';

/**
 * Apparition au défilement : <section appReveal> reçoit la classe `apparition` (invisible, 22 px plus bas),
 * puis `visible` la première fois qu'elle entre à l'écran, et n'est plus observée ensuite (une seule fois).
 * Sans IntersectionObserver, l'élément est affiché tout de suite. Code navigateur après le 1er affichage.
 */
@Directive({
  selector: '[appReveal]',
  host: { class: 'apparition' },
})
export class RevealDirective {
  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof IntersectionObserver === 'undefined') return el.classList.add('visible');
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
      observer.observe(el);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
