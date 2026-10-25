import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/** /conditions-vendeurs : même document que la page VendorTerms du site React (texte fixe) */
@Component({
  selector: 'app-vendor-terms-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="page" data-testid="vendor-terms">
      <div class="document">
        <div class="icone"><app-icon name="scale" [size]="28" /></div>
        <p class="surtitre-doc">Document officiel · Version 1.0 (2026)</p>
        <h1>Conditions Générales d'Utilisation et Règles Applicables aux Vendeurs</h1>
        <p class="sous-titre">Marketplace Elegance Deco — Plateforme de décoration et artisanat d'art en Tunisie</p>

        <div class="sections">
          <section>
            <h2><app-icon name="store" /> 1. Objet et Champ d'Application</h2>
            <p>Les présentes Conditions Générales d'Utilisation Vendeur (ci-après « CGU Vendeur ») régissent les relations contractuelles entre la marketplace <strong>Elegance Deco</strong> et tout artisan, atelier, créateur ou commerçant (ci-après « le Vendeur ») demandant l'ouverture d'une boutique sur la plateforme.</p>
            <p>L'inscription en qualité de Vendeur emporte acceptation expresse, pleine et entière des présentes conditions, enregistrée électroniquement avec horodatage et archivage de la version applicable.</p>
          </section>
          <section>
            <h2><app-icon name="shield-check" /> 2. Processus de Validation et Agrément Préalable</h2>
            <p>La création d'un compte vendeur n'octroie <strong>aucun droit automatique</strong> de publication ou de vente immédiate. Tout dossier d'inscription fait l'objet d'un examen minutieux par l'équipe d'administration d'Elegance Deco.</p>
            <ul>
              <li><strong>Statut En Attente (pending) :</strong> Dès la soumission du formulaire, la boutique est placée en examen. Le vendeur ne peut ni publier de produit ni recevoir de paiement tant que l'approbation n'a pas été confirmée.</li>
              <li><strong>Critères de sélection :</strong> Authenticité des créations, respect des standards de qualité (miroirs LED, néons, MDF/CNC, art mural, etc.), conformité des coordonnées et numéro WhatsApp professionnel.</li>
              <li><strong>Décision d'agrément :</strong> L'administrateur se réserve le droit d'approuver, de refuser avec motif motivé ou de demander des pièces complémentaires.</li>
            </ul>
          </section>
          <section>
            <h2><app-icon name="circle-check" /> 3. Engagements du Vendeur Partenaire</h2>
            <p>Le Vendeur s'engage formellement à :</p>
            <ul>
              <li>Fournir des photographies fidèles et réelles de ses réalisations sans tromperie sur les dimensions, finitions ou matières.</li>
              <li>Indiquer des prix nets en Dinars Tunisiens (TND) transparents pour le consommateur.</li>
              <li>Honorer les commandes confirmées dans les délais convenus et assurer un emballage protecteur adapté aux articles fragiles (verre, miroirs, bois).</li>
              <li>Maintenir son numéro WhatsApp professionnel et ses coordonnées de contact opérationnels pour le service client.</li>
            </ul>
          </section>
          <section>
            <h2><app-icon name="file-text" /> 4. Modèle Économique et Commissions</h2>
            <p>La marketplace Elegance Deco prélève une commission de service transparente de <strong>10%</strong> sur le montant brut des ventes finalisées via la plateforme, couvrant les coûts d'hébergement, la visibilité marketing et l'infrastructure technique.</p>
            <p>Les règlements des commandes contre remboursement (paiement à la livraison) sont suivis selon le bordereau d'expédition et le décompte validé dans l'espace vendeur.</p>
          </section>
          <section>
            <h2><app-icon name="circle-alert" /> 5. Suspension et Résiliation</h2>
            <p>L'administration d'Elegance Deco se réserve le droit de suspendre temporairement ou de résilier définitivement l'accès d'un vendeur en cas de manquement grave : non-livraison répétée, contrefaçon, dégradation de la qualité, comportement abusif envers les acheteurs ou déclarations mensongères.</p>
          </section>
        </div>

        <div class="pied-doc">
          <p>Dernière mise à jour : 12 Octobre 2026 · Elegance Deco Tunisie</p>
          <a routerLink="/" class="bouton">Retour au site</a>
        </div>
      </div>
    </div>
  `,
  styles: `
    .page { max-width: 56rem; margin: 0 auto; padding: 48px 16px; }
    .document { padding: 24px; border: 1px solid var(--ligne-20, #eadfd6); border-radius: 24px; background: var(--carte); box-shadow: 0 1px 2px rgba(0, 0, 0, .05); }
    .icone { display: flex; width: 56px; height: 56px; align-items: center; justify-content: center; margin-bottom: 24px; border-radius: 16px; background: var(--ligne-6, #f4e9e0); color: var(--cuivre-16, #8e5d3e); }
    .surtitre-doc { margin: 0; color: var(--cuivre-13, #9a6341); font-size: 12px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; }
    h1 { margin-top: 12px; font-size: 30px; font-weight: 700; letter-spacing: -0.025em; }
    .sous-titre { margin: 12px 0 0; color: var(--gris-11, #7c6d64); font-size: 14px; }
    .sections { display: grid; gap: 32px; margin-top: 32px; color: var(--encre-2, #5c4e44); font-size: 14px; line-height: 1.625; }
    section > * + * { margin-top: 12px; }
    h2 { display: flex; align-items: center; gap: 8px; color: var(--encre-9, #302a26); font-size: 20px; font-weight: 700; }
    h2 app-icon { color: var(--cuivre-16, #8e5d3e); }
    p { margin: 0; }
    ul { margin-bottom: 0; padding-left: 20px; color: var(--gris-20, #6f6055); }
    li + li { margin-top: 6px; }
    .pied-doc { display: flex; flex-direction: column; align-items: center; justify-content: space-between; gap: 16px; margin-top: 40px; padding-top: 24px; border-top: 1px solid var(--ligne-14, #eee6df); }
    .pied-doc p { color: var(--gris-11, #7c6d64); font-size: 12px; }
    .pied-doc .bouton { min-height: 44px; font-size: 12px; }
    @media (min-width: 640px) { .page { padding: 48px 24px; } .document { padding: 48px; } h1 { font-size: 36px; } .pied-doc { flex-direction: row; } }
    @media (min-width: 1024px) { .page { padding-top: 64px; padding-bottom: 64px; } }
  `,
})
export class VendorTermsPage {}
