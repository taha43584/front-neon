import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { SiteService } from '../../../core/services/site.service';

/** Conditions générales / conditions de vente, rédigées par l'administration (Paramètres), comme le site React */
@Component({
  selector: 'app-legal-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="document" data-testid="legal-page">
      <h1>{{ title() }}</h1>
      @if (!site.settingsLoaded()) {
        <p class="chargement">Chargement…</p>
      } @else if (text()) {
        <div class="texte">{{ text() }}</div>
      } @else {
        <p class="non-publie">Ce document n'a pas encore été publié par l'administration du marketplace.</p>
      }
    </article>
  `,
  styles: `
    .document { max-width: 48rem; margin: 0 auto; padding: 48px 16px; }
    h1 { font-size: 36px; letter-spacing: -0.04em; }
    .chargement { margin: 24px 0 0; color: var(--gris-11, #7c6d64); font-size: 14px; }
    .texte { margin-top: 32px; color: var(--encre-4, #4f433b); font-size: 15px; line-height: 1.75rem; white-space: pre-line; }
    .non-publie { margin: 24px 0 0; padding: 24px; border-radius: 16px; background: var(--surface-32, #f5eee8); color: var(--gris-11, #7c6d64); font-size: 14px; }
    @media (min-width: 640px) { .document { padding: 48px 24px; } }
  `,
})
export class LegalPage {
  readonly site = inject(SiteService);
  /** Donnée de route : quel document afficher */
  readonly kind = input<'terms' | 'sales'>('terms');
  readonly title = computed(() => (this.kind() === 'terms' ? "Conditions générales d'utilisation" : 'Conditions de vente'));
  readonly text = computed(() => {
    const s = this.site.settings();
    return (this.kind() === 'terms' ? s?.termsOfService : s?.salesTerms) ?? '';
  });
}
