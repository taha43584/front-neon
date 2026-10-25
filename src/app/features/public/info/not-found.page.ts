import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/**
 * Page 404 : toute adresse inconnue (route « ** ») et /404.
 * Le site React affiche ici une page anglaise générique (« Page Not Found ») aux couleurs d'un modèle :
 * en Angular elle est en français et aux couleurs du site (écart volontaire, noté pour l'étape A-09).
 */
@Component({
  selector: 'app-not-found-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="page" data-testid="not-found">
      <div class="icone"><app-icon name="compass" [size]="28" /></div>
      <p class="code">Erreur 404</p>
      <h1>Cette page est introuvable</h1>
      <p class="texte">L'adresse est peut-être incorrecte, ou la page a été déplacée ou supprimée.</p>
      <div class="actions">
        <a routerLink="/" class="bouton"><app-icon name="house" [size]="16" /> Retour à l'accueil</a>
        <a routerLink="/produits" class="bouton bouton-contour">Découvrir le catalogue <app-icon name="arrow-right" [size]="16" /></a>
      </div>
    </div>
  `,
  styles: `
    .page { max-width: 36rem; margin: 0 auto; padding: 80px 16px; text-align: center; }
    .icone { display: inline-flex; width: 56px; height: 56px; align-items: center; justify-content: center; border-radius: 16px; background: var(--ligne-6, #f4e9e0); color: var(--cuivre-16, #8e5d3e); }
    .code { margin: 24px 0 0; color: var(--surtitre); font-size: 12px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; }
    h1 { margin-top: 12px; font-size: 36px; letter-spacing: -0.03em; }
    .texte { margin: 12px 0 0; color: var(--texte-secondaire); font-size: 15px; line-height: 1.6; }
    .actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 32px; }
    .bouton-contour { border: 1px solid var(--bordure); background: var(--carte); color: var(--texte); }
  `,
})
export class NotFoundPage {}
