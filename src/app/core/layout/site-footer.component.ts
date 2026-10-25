import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteService } from '../services/site.service';
import { IconComponent } from '../../shared/components/icon/icon.component';

/**
 * Pied de page du site public, comme le site React : nom et accroche, réseaux sociaux, liens « Acheter »
 * (4 premières catégories), « Informations » (vendre, conditions, aide) et coordonnées.
 * Tout vient des paramètres du marketplace (catalog.settings) : un champ vide n'est pas affiché.
 */
@Component({
  selector: 'app-site-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    @let s = site.settings();
    <footer class="pied toujours-sombre" data-testid="site-footer">
      <div class="grille">
        <div>
          <p class="nom">{{ site.name() }}<span>.</span></p>
          @if (s?.tagline) { <p class="accroche">{{ s!.tagline }}</p> }
          @if (s?.socialInstagram || s?.socialFacebook) {
            <div class="reseaux">
              @if (s!.socialInstagram) { <a [href]="s!.socialInstagram" target="_blank" rel="noreferrer" aria-label="Instagram"><app-icon name="instagram" [size]="16" /></a> }
              @if (s!.socialFacebook) { <a [href]="s!.socialFacebook" target="_blank" rel="noreferrer" aria-label="Facebook"><app-icon name="facebook" [size]="16" /></a> }
            </div>
          }
        </div>
        <div>
          <h3>Acheter</h3>
          <ul>
            <li><a routerLink="/produits">Tous les produits</a></li>
            @for (c of firstCategories(); track c.slug) { <li><a [routerLink]="['/categorie', c.slug]">{{ c.name }}</a></li> }
            <li><a routerLink="/boutiques">Boutiques</a></li>
          </ul>
        </div>
        <div>
          <h3>Informations</h3>
          <ul>
            <li><a routerLink="/vendre">Vendre sur {{ site.name() }}</a></li>
            <li><a routerLink="/conditions-generales">Conditions générales</a></li>
            <li><a routerLink="/conditions-de-vente">Conditions de vente</a></li>
            <li><a routerLink="/conditions-vendeurs">Conditions vendeurs</a></li>
            <li><a routerLink="/aide">Aide</a></li>
          </ul>
        </div>
        <div>
          <h3>Contact</h3>
          <ul class="contact">
            @if (s?.contactEmail) { <li><app-icon name="mail" [size]="16" /> {{ s!.contactEmail }}</li> }
            @if (s?.contactPhone) { <li><app-icon name="phone" [size]="16" /> {{ s!.contactPhone }}</li> }
            @if (s?.whatsapp) { <li><app-icon name="message-circle" [size]="16" /> WhatsApp : {{ s!.whatsapp }}</li> }
            @if (s?.contactAddress) { <li class="haut"><app-icon name="map-pin" [size]="16" /> {{ s!.contactAddress }}</li> }
            @if (s?.deliveryInfo) { <li class="livraison">{{ s!.deliveryInfo }}</li> }
          </ul>
        </div>
      </div>
      <div class="bas">
        <span>© {{ year }} {{ site.name() }}. Tous droits réservés.</span>
        <span>Paiement à la livraison · Prix en dinars tunisiens (DT) · Tunisie</span>
      </div>
    </footer>
    <!-- Place de la barre du bas (téléphone) -->
    <div class="place-barre toujours-sombre" aria-hidden="true"></div>
  `,
  styles: `
    .pied { margin-top: 80px; padding: 48px 16px; background: var(--encre-10, #29231f); color: var(--ligne-17, #eee4db); }
    .grille, .bas { max-width: 1400px; margin-right: auto; margin-left: auto; }
    .grille { display: grid; gap: 40px; }
    .nom { margin: 0; font-family: var(--police-titre); font-size: 24px; font-weight: 600; }
    .nom span { color: var(--cuivre-6, #d4a67f); }
    .accroche { max-width: 20rem; margin: 12px 0 0; color: var(--gris-2, #b9aaa0); font-size: 14px; line-height: 1.7; }
    .reseaux { display: flex; gap: 8px; margin-top: 20px; }
    .reseaux a { display: flex; width: 44px; height: 44px; align-items: center; justify-content: center; border: 1px solid var(--gris-24, #67584e); border-radius: 999px; color: inherit; }
    .reseaux a:hover { background: rgba(255, 255, 255, 0.1); background: color-mix(in srgb, var(--carte) 10%, transparent); }
    h3 { font-family: var(--police-texte); font-size: 16px; font-weight: 600; letter-spacing: 0; }
    ul { margin: 16px 0 0; padding: 0; color: var(--gris-2, #b9aaa0); font-size: 14px; list-style: none; }
    ul a { display: inline-flex; min-width: 44px; min-height: 44px; align-items: center; color: inherit; text-decoration: none; }
    ul a:hover { color: var(--carte); }
    .contact li { display: flex; min-height: 36px; align-items: center; gap: 8px; }
    .contact li.haut { align-items: flex-start; padding-top: 8px; }
    .contact .livraison { padding-top: 4px; color: var(--gris-8, #99897f); font-size: 12px; line-height: 1.6; }
    .bas { display: flex; flex-direction: column; gap: 8px; margin-top: 40px; padding-top: 24px; border-top: 1px solid var(--encre-5, #4b3f37); color: var(--gris-8, #99897f); font-size: 12px; }
    .place-barre { height: calc(60px + env(safe-area-inset-bottom)); background: var(--encre-10, #29231f); }
    @media (min-width: 640px) {
      .pied { padding: 48px 24px; }
      .grille { grid-template-columns: 1fr 1fr; }
      .bas { flex-direction: row; justify-content: space-between; }
    }
    @media (min-width: 768px) { .place-barre { display: none; } }
    @media (min-width: 1024px) {
      .pied { padding: 48px 40px; }
      .grille { grid-template-columns: 1.4fr 1fr 1fr 1.2fr; }
    }
  `,
})
export class SiteFooterComponent {
  readonly site = inject(SiteService);
  readonly year = new Date().getFullYear();
  readonly firstCategories = computed(() => this.site.categories().slice(0, 4));
}
