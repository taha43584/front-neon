import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import type { IconName } from '../../../shared/components/icon/icons';

type InfoKey = 'aide' | 'suivi' | 'vendre';

/** Mêmes textes que la page InfoPage du site React */
const CONTENT: Record<InfoKey, { eyebrow: string; title: string; intro: string; icon: IconName; cards: [string, string][] }> = {
  aide: {
    eyebrow: "Centre d'aide",
    title: 'Une réponse claire, au bon moment.',
    intro: 'Retrouvez les informations essentielles pour découvrir, commander et échanger avec les boutiques Elegance Deco.',
    icon: 'headphones',
    cards: [
      ['Avant de commander', 'Consultez les dimensions, matières, délais et possibilités de personnalisation sur chaque fiche produit.'],
      ['Après votre achat', 'Votre boutique vous accompagne pour les détails de fabrication et de livraison.'],
      ["Besoin d'échanger", 'Les messages privés entre clients et boutiques seront accessibles depuis votre espace personnel.'],
    ],
  },
  suivi: {
    eyebrow: 'Suivre ma commande',
    title: 'Votre décoration, étape par étape.',
    intro: 'Saisissez votre référence de commande pour retrouver son statut. Le suivi détaillé sera connecté au compte client et aux transporteurs partenaires.',
    icon: 'map-pin',
    cards: [
      ['Commande confirmée', 'La boutique a reçu votre demande et vérifie les options choisies.'],
      ['En préparation', 'Votre création est en cours de fabrication ou de préparation.'],
      ['Expédiée', 'Le colis est remis au transporteur avec un numéro de suivi.'],
    ],
  },
  vendre: {
    eyebrow: 'Vendre avec nous',
    title: 'Faites découvrir votre savoir-faire.',
    intro: 'Elegance Deco donne une vitrine aux ateliers, artisans et studios tunisiens qui façonnent des espaces singuliers.',
    icon: 'store',
    cards: [
      ['Présentez votre univers', 'Décrivez votre atelier, vos matières et les types de projets que vous aimez réaliser.'],
      ['Publiez vos créations', 'Ajoutez vos produits, variantes, délais, zones de livraison et options sur mesure.'],
      ['Grandissez avec vos clients', 'Recevez des demandes qualifiées et développez une boutique qui vous ressemble.'],
    ],
  },
};

/** /aide, /suivre-commande, /vendre : une seule page, le contenu est choisi par la donnée de route `page` */
@Component({
  selector: 'app-info-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    @let c = content();
    <div class="page" [attr.data-testid]="'info-' + page()">
      <div class="entete">
        <div class="icone"><app-icon [name]="c.icon" /></div>
        <p class="surtitre-info">{{ c.eyebrow }}</p>
        <h1>{{ c.title }}</h1>
        <p class="intro">{{ c.intro }}</p>
      </div>
      <div class="cartes">
        @for (card of c.cards; track card[0]) {
          <div class="carte-info">
            <div class="coche"><app-icon name="check" [size]="16" /></div>
            <h2>{{ card[0] }}</h2>
            <p>{{ card[1] }}</p>
          </div>
        }
      </div>
      <div class="encart">
        <app-icon name="truck" class="camion" />
        <div>
          <h2>Une marketplace pensée pour la Tunisie</h2>
          <p>Rejoignez les meilleurs ateliers tunisiens et vendez vos créations artisanales et design avec des outils professionnels.</p>
        </div>
      </div>
      <div class="actions">
        <a routerLink="/" class="bouton"><app-icon name="arrow-left" [size]="16" /> Retour à l'accueil</a>
        @if (page() === 'vendre') {
          <a routerLink="/espace-vendeur" class="bouton bouton-accent"><app-icon name="store" [size]="16" /> Accéder à l'espace vendeur <app-icon name="arrow-right" [size]="16" /></a>
        } @else {
          <a routerLink="/produits" class="bouton bouton-contour">Découvrir le catalogue <app-icon name="arrow-right" [size]="16" /></a>
        }
      </div>
    </div>
  `,
  styles: `
    .page { max-width: 1100px; margin: 0 auto; padding: 48px 16px; }
    .entete { max-width: 42rem; }
    .icone { display: flex; width: 48px; height: 48px; align-items: center; justify-content: center; border-radius: 16px; background: var(--ligne-16, #f2e3d7); color: var(--cuivre-16, #8e5d3e); }
    .surtitre-info { margin: 32px 0 0; color: var(--cuivre-13, #9a6341); font-size: 12px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; }
    h1 { margin-top: 12px; font-size: 48px; line-height: 1.05; letter-spacing: -0.05em; }
    .intro { margin: 24px 0 0; color: var(--gris-21, #6d5e54); font-size: 18px; line-height: 2rem; }
    .cartes { display: grid; gap: 16px; margin-top: 56px; }
    .carte-info { padding: 24px; border: 1px solid var(--ligne-19, #eee3da); border-radius: 1.35rem; background: var(--carte); }
    .coche { display: flex; width: 36px; height: 36px; align-items: center; justify-content: center; border-radius: 999px; background: var(--surface-27, #f7efe9); color: var(--cuivre-16, #8e5d3e); }
    .carte-info h2 { margin-top: 20px; font-family: var(--police-texte); font-size: 18px; font-weight: 600; letter-spacing: 0; }
    .carte-info p { margin: 12px 0 0; color: var(--gris-13, #7d6e64); font-size: 14px; line-height: 1.5rem; }
    .encart { display: flex; align-items: flex-start; gap: 16px; margin-top: 56px; padding: 28px; border-radius: 1.5rem; background: var(--ligne-1, #f3ede7); }
    .camion { margin-top: 4px; color: var(--cuivre-16, #8e5d3e); }
    .encart h2 { font-size: 24px; }
    .encart p { max-width: 42rem; margin: 12px 0 0; color: var(--gris-18, #75665c); font-size: 14px; line-height: 1.5rem; }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 40px; }
    .actions .bouton { min-height: 44px; padding: 0 20px; }
    .bouton-accent { background: var(--cuivre-16, #8e5d3e); }
    .bouton-accent:hover { background: var(--cuivre-23, #885a3c); }
    .bouton-contour { border: 1px solid var(--ligne-32, #decfc4); background: transparent; color: var(--texte); }
    @media (min-width: 640px) { .page { padding: 48px 24px; } h1 { font-size: 60px; } .encart { padding: 40px; } }
    @media (min-width: 768px) { .cartes { grid-template-columns: repeat(3, 1fr); } }
    @media (min-width: 1024px) { .page { padding-top: 80px; padding-bottom: 80px; } }
  `,
})
export class InfoPage {
  /** Donnée de route (withComponentInputBinding) */
  readonly page = input<InfoKey>('aide');
  readonly content = computed(() => CONTENT[this.page()] ?? CONTENT.aide);
}
