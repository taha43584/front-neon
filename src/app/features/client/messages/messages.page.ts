import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { MessagesPanelComponent } from '../../../shared/components/messages-panel/messages-panel.component';

/** /messages et /messages/:shopSlug (compte connecté, authGuard) : la messagerie privée avec les boutiques */
@Component({
  selector: 'app-messages-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, MessagesPanelComponent],
  template: `
    <div class="conteneur page">
      <a routerLink="/espace-client" class="retour"><app-icon name="arrow-left" [size]="16" /> Retour à l'espace personnel</a>
      <p class="surtitre">Espace personnel</p>
      <h1>Votre messagerie</h1>
      <p class="intro">Un espace privé pour échanger avec les boutiques au sujet de vos projets de décoration.</p>
      <div class="panneau"><app-messages-panel [initialShopSlug]="shopSlug()" /></div>
    </div>
  `,
  styles: `
    .page { max-width: 72rem; padding-top: 24px; padding-bottom: 32px; }
    .retour { display: inline-flex; min-height: 44px; align-items: center; gap: 8px; color: var(--cuivre-26, #745641); font-size: 14px; font-weight: 600; text-decoration: none; }
    .retour:hover { color: var(--cuivre-16, #8e5d3e); }
    .surtitre { margin-top: 24px; color: var(--cuivre-13, #9a6341); }
    h1 { font-size: 36px; letter-spacing: -0.05em; }
    .intro { max-width: 42rem; margin: 12px 0 0; color: var(--gris-11, #7c6d64); font-size: 14px; line-height: 1.5rem; }
    .panneau { margin-top: 32px; }
    @media (min-width: 640px) { h1 { font-size: 48px; } }
  `,
})
export class MessagesPage {
  /** Paramètre de route facultatif /messages/:shopSlug */
  readonly shopSlug = input<string | undefined>(undefined);
}
