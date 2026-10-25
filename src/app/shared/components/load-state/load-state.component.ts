import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * État de chargement / d'erreur RÉUTILISABLE.
 * - status 'loading' : cartes grises animées (squelette) à la taille des vraies cartes
 * - status 'error'   : message + bouton « Réessayer » qui prévient la page par un output()
 */
@Component({
  selector: 'app-load-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (status() === 'loading') {
      <div class="grille" role="status" aria-label="Chargement…">
        @for (i of placeholders(); track i) {
          <div class="squelette-carte" aria-hidden="true">
            <div class="squelette photo"></div>
            <div class="squelette ligne"></div>
            <div class="squelette ligne courte"></div>
          </div>
        }
      </div>
    } @else if (status() === 'error') {
      <div class="erreur" role="alert">
        <p class="titre">{{ errorTitle() }}</p>
        <p>Vérifiez votre connexion puis réessayez.</p>
        <button type="button" class="bouton" (click)="retry.emit()">Réessayer</button>
      </div>
    }
  `,
  styles: `
    .grille { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 32px 12px; }
    @media (min-width: 768px) { .grille { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 40px 20px; } }
    .photo { aspect-ratio: 4 / 5; border-radius: 20px; }
    .ligne { height: 14px; margin-top: 12px; border-radius: 999px; }
    .courte { width: 40%; }
    .erreur { padding: 40px 16px; border: 1px dashed var(--bordure); border-radius: 22px; background: var(--carte); text-align: center; color: var(--texte-secondaire); }
    .titre { margin: 0 0 8px; color: var(--texte); font-family: var(--police-titre); font-size: 24px; }
  `,
})
export class LoadStateComponent {
  readonly status = input.required<'loading' | 'error' | 'ok'>();
  readonly count = input(8);
  readonly errorTitle = input('Catalogue momentanément indisponible');
  /** La page décide quoi recharger quand on clique « Réessayer » */
  readonly retry = output<void>();

  placeholders() {
    return Array.from({ length: this.count() }, (_, i) => i);
  }
}
