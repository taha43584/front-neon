import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { REVIEW_CRITERIA, REVIEW_REPLY_MAX } from '@shared/reviewRules';
import { ReviewsService, VendorReview } from '../../core/services/reviews.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { StarsComponent } from '../../shared/components/stars/stars.component';

/**
 * /espace-vendeur/avis (A-10c) : avis de la boutique (photos, critères, variante achetée) et réponse de l'atelier.
 * Le vendeur répond UNE fois, publiquement, aux avis publiés ; il ne peut ni modifier ni supprimer un avis.
 */
@Component({
  selector: 'app-vendor-reviews-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, IconComponent, StarsComponent],
  template: `
    <div class="titre-page"><div><h1>Avis clients</h1><p>Les avis sont vérifiés par l'administration avant publication. Vous pouvez répondre une fois, publiquement, à chaque avis publié.</p></div></div>
    <section class="bloc">
      @switch (status()) {
        @case ('loading') { <p class="petit" role="status">Chargement…</p> }
        @case ('error') { <p class="petit" role="alert">Les avis n'ont pas pu être chargés. <button type="button" class="lien-bouton" (click)="load()">Réessayer</button></p> }
        @default {
          @if (visible().length) {
            <ul class="avis" data-testid="vendor-reviews">
              @for (r of visible(); track r.id) {
                <li>
                  <div class="entete">
                    <p class="produit">{{ r.productName }}</p>
                    <span class="petit">{{ r.createdAt | date: 'd MMM y' }}</span>
                  </div>
                  <div class="ligne">
                    <app-stars [value]="r.rating" [size]="15" />
                    <span class="petit">{{ r.author }}{{ r.authorGovernorate ? ' · ' + r.authorGovernorate : '' }}</span>
                    @if (r.status === 'pending') { <span class="attente">En attente de publication</span> }
                  </div>
                  @if (r.purchasedVariant) { <p class="petit">Acheté : {{ r.purchasedVariant }}</p> }
                  <p class="texte-avis">{{ r.body }}</p>
                  @if (r.photos.length) {
                    <ul class="photos">
                      @for (p of r.photos; track p.id) { <li><a [href]="p.url" target="_blank" rel="noopener" [attr.aria-label]="'Ouvrir la photo du client en grand'"><img [src]="p.url" alt="" loading="lazy" /></a></li> }
                    </ul>
                  }
                  @if (r.qualityRating !== null) {
                    <p class="petit">
                      @for (c of criteria; track c.key; let last = $last) {
                        <span>{{ c.label }} {{ r[c.key] }}/5</span>@if (!last) {<span aria-hidden="true"> · </span>}
                      }
                    </p>
                  }
                  @if (r.vendorReply) {
                    <div class="reponse" data-testid="vendor-reply"><p class="titre-reponse">Votre réponse · {{ r.vendorReplyAt | date: 'd MMM y' }}</p><p>{{ r.vendorReply }}</p></div>
                  } @else if (r.canReply) {
                    <form class="form-reponse" novalidate (submit)="$event.preventDefault(); send(r)">
                      <label [for]="'reponse-' + r.id">Répondre publiquement</label>
                      <textarea [id]="'reponse-' + r.id" class="champ" rows="2" [maxLength]="replyMax" [value]="drafts()[r.id] ?? ''" (input)="setDraft(r.id, $any($event.target).value)" data-testid="reply-text"></textarea>
                      <p class="petit">Votre réponse sera visible sur la fiche produit et ne pourra plus être modifiée.</p>
                      @if (errors()[r.id]) { <p class="erreur" role="alert">{{ errors()[r.id] }}</p> }
                      <button type="submit" class="bouton petit-bouton" [disabled]="saving() === r.id" data-testid="reply-send">{{ saving() === r.id ? 'Envoi…' : 'Publier ma réponse' }}</button>
                    </form>
                  }
                </li>
              }
            </ul>
          } @else {
            <div class="vide-bloc"><app-icon name="star" [size]="28" class="accent" /><p>Aucun avis pour le moment.</p></div>
          }
        }
      }
    </section>
  `,
  styleUrls: ['./vendor-pages.css'],
  styles: `
    .avis { margin: 0; padding: 0 4px; list-style: none; }
    .avis > li { display: grid; gap: 6px; padding: 16px 0; border-bottom: 1px solid var(--ligne-12, #f0e6de); }
    .avis > li:last-child { border-bottom: none; }
    .entete, .ligne { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 12px; }
    .ligne { justify-content: flex-start; }
    .produit { margin: 0; font-size: 14px; font-weight: 600; }
    .petit { margin: 0; }
    .attente { padding: 2px 8px; border-radius: 999px; background: var(--surface-21, #fdf3e2); color: var(--cuivre-25, #8a5a1a); font-size: 12px; font-weight: 600; }
    .texte-avis { margin: 0; color: var(--gris-22, #6e5d53); font-size: 14px; line-height: 1.5rem; white-space: pre-line; }
    .photos { display: flex; gap: 6px; margin: 0; padding: 0; list-style: none; }
    .photos a { display: block; width: 60px; height: 60px; overflow: hidden; border-radius: 10px; }
    .photos img { width: 100%; height: 100%; object-fit: cover; }
    .reponse { padding: 8px 12px; border-left: 3px solid var(--accent); border-radius: 0 10px 10px 0; background: var(--surface-25, #f7f1ec); font-size: 13px; }
    .reponse p { margin: 0; }
    .titre-reponse { color: var(--surtitre); font-weight: 600; }
    .form-reponse { display: grid; gap: 6px; font-size: 13px; font-weight: 600; }
    .form-reponse .champ { height: auto; padding: 8px 12px; font-weight: 400; }
    .petit-bouton { justify-self: start; min-height: 44px; padding: 0 18px; }
    .erreur { margin: 0; color: var(--erreur); font-weight: 400; }
    .lien-bouton { min-height: 44px; border: none; background: none; color: var(--surtitre); font-weight: 600; text-decoration: underline; cursor: pointer; }
    .accent { color: var(--cuivre-16, #8e5d3e); }
    .vide-bloc { display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .vide-bloc p { margin: 0; }
  `,
})
export class VendorReviewsPage implements OnInit {
  private readonly reviews = inject(ReviewsService);

  readonly criteria = REVIEW_CRITERIA;
  readonly replyMax = REVIEW_REPLY_MAX;
  readonly status = signal<'loading' | 'ok' | 'error'>('loading');
  readonly list = signal<VendorReview[]>([]);
  /** Publiés et en attente (les avis masqués par l'administration ne sont pas montrés) */
  readonly visible = computed(() => this.list().filter((r) => r.status !== 'rejected'));
  readonly drafts = signal<Partial<Record<number, string>>>({});
  readonly errors = signal<Partial<Record<number, string>>>({});
  readonly saving = signal<number | null>(null);

  ngOnInit() {
    void this.load();
  }

  async load() {
    this.status.set('loading');
    try {
      this.list.set(await this.reviews.vendorReviews());
      this.status.set('ok');
    } catch {
      this.status.set('error');
    }
  }

  setDraft(id: number, value: string) {
    this.drafts.update((d) => ({ ...d, [id]: value }));
  }

  async send(review: VendorReview) {
    const body = (this.drafts()[review.id] ?? '').trim();
    if (body.length < 2) return this.errors.update((e) => ({ ...e, [review.id]: 'Votre réponse est vide.' }));
    this.saving.set(review.id);
    this.errors.update((e) => ({ ...e, [review.id]: '' }));
    try {
      await this.reviews.reply(review.id, body);
      this.list.set(await this.reviews.vendorReviews());
    } catch (e) {
      this.errors.update((all) => ({ ...all, [review.id]: e instanceof Error ? e.message : "La réponse n'a pas pu être publiée." }));
    } finally {
      this.saving.set(null);
    }
  }
}
