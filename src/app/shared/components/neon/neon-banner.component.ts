import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Halo du mot lumineux (statique) ; l'allumage et le scintillement sont dans styles.css */
const NEON_GLOW = '0 0 4px #fff, 0 0 12px #ff8fc7, 0 0 28px #ff4fa8, 0 0 56px #ff2d95, 0 0 96px #ff2d95';

/**
 * Bannière de la catégorie liée au configurateur néon (affichée seulement si le serveur répond neonBanner: true :
 * catégorie choisie par l'admin et bannière activée). Le mot s'allume quand la bannière entre à l'écran.
 */
@Component({
  selector: 'app-neon-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section class="banniere toujours-sombre" aria-labelledby="neon-banner-title" data-testid="neon-banner">
      <div class="texte">
        <p class="surtitre clair">Personnalisé</p>
        <h2 id="neon-banner-title">Votre texte, votre couleur, votre néon.</h2>
        <p class="intro">Écrivez votre texte, choisissez la police et la couleur, et découvrez l'aperçu lumineux avant de commander.</p>
        <a routerLink="/neon" class="bouton bouton-clair">Créer mon néon <span aria-hidden="true">→</span></a>
      </div>
      <div class="mur">
        <span #word class="mot neon-a-l-ecran" [class.visible]="visible()" aria-hidden="true" [style.text-shadow]="glow">Néon</span>
      </div>
    </section>
  `,
  styles: `
    .banniere { display: grid; overflow: hidden; border-radius: 24px; background: var(--texte); color: #fff; }
    .texte { padding: 24px; }
    .clair { color: #d4a67f; }
    h2 { margin-top: 12px; font-size: 28px; letter-spacing: -0.03em; }
    .intro { max-width: 28rem; margin: 12px 0 0; color: #d7c8bd; font-size: 14px; line-height: 1.7; }
    .bouton-clair { margin-top: 24px; }
    .bouton-clair:hover { background: #fff; }
    .mur { position: relative; display: flex; min-height: 140px; order: -1; align-items: center; justify-content: center; overflow: hidden; padding: 32px 24px; background: radial-gradient(circle at center, #3a2e2a 0%, #1d1815 70%); }
    .mot { color: #ffe4f2; font-family: var(--police-titre); font-size: 64px; font-style: italic; line-height: 1; user-select: none; }
    @media (min-width: 640px) { .banniere { border-radius: 28px; } .texte { padding: 40px; } h2 { font-size: 36px; } .mot { font-size: 88px; } }
    @media (min-width: 768px) { .banniere { grid-template-columns: 1.25fr 1fr; } .mur { order: 0; min-height: 0; padding: 40px 24px; } }
    @media (min-width: 1024px) { .texte { padding: 48px; } }
  `,
})
export class NeonBannerComponent {
  private readonly word = viewChild.required<ElementRef<HTMLElement>>('word');
  readonly visible = signal(false);
  readonly glow = NEON_GLOW;

  constructor() {
    const destroyRef = inject(DestroyRef);
    // Uniquement dans le navigateur, après le premier affichage : on observe l'entrée du mot à l'écran
    afterNextRender(() => {
      if (typeof IntersectionObserver === 'undefined') return this.visible.set(true);
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          this.visible.set(true);
          observer.disconnect();
        }
      }, { threshold: 0.3 });
      observer.observe(this.word().nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
