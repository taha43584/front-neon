import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, signal, viewChild } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WorkshopVideo } from '../../../core/services/catalog.service';
import { FavoritesService } from '../../../core/services/favorites.service';
import { PrixDtPipe } from '../../../shared/pipes/prix-dt.pipe';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ShopLogoComponent } from '../../../shared/components/shop-logo/shop-logo.component';

/**
 * Une vidéo de l'accueil (« Dans nos ateliers, en vidéo »).
 * - Rien n'est téléchargé avant l'affichage : preload="none" + image de couverture (photo du produit).
 * - Lecture muette en boucle SEULEMENT quand la vidéo est visible (IntersectionObserver), pause sinon.
 * - « Réduire les animations » : aucune lecture automatique, bouton ▶ au centre.
 * - Bouton lecture / pause toujours présent (une vidéo qui bouge doit pouvoir être arrêtée).
 * - Toute la carte mène à la fiche produit ; le cœur et le bouton lecture sont des boutons séparés.
 */
@Component({
  selector: 'app-workshop-video',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, RouterLink, PrixDtPipe, IconComponent, ShopLogoComponent],
  host: { '[class.verticale]': 'vertical()' },
  template: `
    @let p = item().product;
    <article class="video" data-testid="workshop-video">
      <video #player [muted]="true" muted loop playsinline preload="none" [poster]="vertical() ? null : (p.image || null)" aria-hidden="true" tabindex="-1"
        (loadedmetadata)="duration.set(player.duration)" (play)="playing.set(true)" (pause)="playing.set(false)">
        <source [src]="item().url" [type]="item().mimeType" />
      </video>
      <!-- Format vertical (téléphone, A-10d) : couverture = image chargée en différé (un « poster » serait toujours téléchargé,
           même hors de l'écran dans la rangée horizontale) ; elle s'efface quand la vidéo joue -->
      @if (vertical() && p.image) { <img class="couverture" [class.cachee]="playing()" [ngSrc]="p.image" alt="" fill [priority]="priority()" (load)="coverDone()" (error)="coverDone()" /> }
      <span class="voile" aria-hidden="true"></span>

      @if (durationLabel(); as d) { <span class="duree"><span class="masque-lecteur">Durée </span>{{ d }}</span> }

      @if (vertical()) {
        <!-- Vertical : atelier + prix ; le lien (nom du produit pour les lecteurs d'écran) couvre la carte -->
        <a class="infos lien-vertical" [routerLink]="['/produit', p.slug]" [attr.aria-label]="p.name + ', ' + p.shopName">
          <span class="boutique"><span>{{ p.shopName }}</span></span>
          <span class="prix">@if (unit()) {<span class="petit">dès </span>}<strong>{{ p.priceTnd | prixDt }}</strong></span>
        </a>
      } @else {
        <div class="infos">
          <p class="boutique">
            <app-shop-logo [name]="p.shopName" [logoUrl]="p.shopLogoUrl" [size]="28" />
            <span>{{ p.shopName }}</span>
          </p>
          <a class="nom" [routerLink]="['/produit', p.slug]">{{ p.name }}</a>
          <p class="prix">
            @if (unit()) { <span class="petit">à partir de </span> }
            <strong>{{ p.priceTnd | prixDt }}</strong>@if (unit()) {<span class="petit"> / {{ unit() }}</span>}
          </p>
        </div>
      }

      <button type="button" class="lecture" [class.centre]="reduced() && !playing()" [attr.aria-label]="(playing() ? 'Mettre en pause la vidéo de ' : 'Lire la vidéo de ') + p.name" (click)="togglePlay()" data-testid="video-play">
        <app-icon [name]="playing() ? 'pause' : 'play'" [size]="reduced() && !playing() ? 26 : 16" [filled]="true" />
      </button>
      @if (!vertical()) {
        <button type="button" class="favori" [class.actif]="favorite()" [attr.aria-pressed]="favorite()"
          [attr.aria-label]="(favorite() ? 'Retirer ' : 'Ajouter ') + p.name + (favorite() ? ' des favoris' : ' aux favoris')" (click)="toggleFavorite()">
          <app-icon name="heart" [size]="18" [filled]="favorite()" />
        </button>
      }
    </article>
  `,
  styles: `
    :host { display: block; min-width: 0; }
    /* isolation : la vidéo et le voile (z-index -1) passent sous les textes, qui restent non positionnés */
    .video { position: relative; isolation: isolate; display: flex; height: 100%; min-height: 220px; flex-direction: column; justify-content: flex-end; overflow: hidden; padding: 12px; border-radius: 20px; background: #2a2420; color: #fff; }
    video { position: absolute; z-index: -1; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    .voile { position: absolute; z-index: -1; inset: 0; background: linear-gradient(to top, rgba(28, 22, 18, 0.85), rgba(28, 22, 18, 0.15) 55%, rgba(28, 22, 18, 0.25)); pointer-events: none; }
    .duree { position: absolute; top: 12px; left: 12px; padding: 2px 8px; border-radius: 999px; background: rgba(0, 0, 0, 0.6); font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; }
    /* Pas de position : le lien étendu (.nom::after) se place par rapport à la carte entière */
    .infos { min-width: 0; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4); }
    .boutique { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 12px; font-weight: 600; }
    .boutique span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .nom { display: block; overflow: hidden; margin-top: 6px; color: #fff; font-size: 14px; font-weight: 600; line-height: 1.3; text-decoration: none; text-overflow: ellipsis; white-space: nowrap; }
    /* Toute la carte est cliquable : le lien s'étend sur la carte */
    .nom::after { content: ""; position: absolute; inset: 0; }
    .nom:focus-visible { outline: none; }
    .nom:focus-visible::after { border-radius: 20px; outline: 2px solid #fff; outline-offset: -4px; }
    .prix { margin: 2px 0 0; font-size: 14px; }
    .petit { font-size: 12px; opacity: 0.85; }
    .lecture, .favori { position: absolute; z-index: 1; display: flex; width: 44px; height: 44px; align-items: center; justify-content: center; padding: 0; border: none; border-radius: 999px; cursor: pointer; }
    .lecture { top: 8px; right: 56px; background: rgba(0, 0, 0, 0.45); color: #fff; }
    .lecture.centre { top: 50%; left: 50%; width: 64px; height: 64px; background: rgba(255, 255, 255, 0.92); color: var(--texte); transform: translate(-50%, -60%); }
    .favori { top: 8px; right: 8px; background: rgba(255, 255, 255, 0.92); color: var(--texte); }
    .favori.actif { color: var(--promo); }
    .lecture:focus-visible, .favori:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
    :host(.grande) .nom { font-size: 18px; }
    @media (min-width: 768px) { :host(.grande) .video { padding: 20px; } }
    /* ----- Format vertical 9:16 (téléphone, A-10d) ----- */
    :host(.verticale) { width: 132px; height: 220px; flex-shrink: 0; }
    :host(.verticale) .video { min-height: 0; padding: 10px; border-radius: 18px; }
    .couverture { z-index: -1; object-fit: cover; transition: opacity .3s; }
    .couverture.cachee { opacity: 0; }
    :host(.verticale) .duree { top: 8px; left: 8px; font-size: 13px; }
    :host(.verticale) .lecture { top: 4px; right: 4px; }
    :host(.verticale) .lecture.centre { top: 50%; left: 50%; right: auto; width: 52px; height: 52px; }
    .lien-vertical { display: flex; flex-direction: column; gap: 2px; color: #fff; text-decoration: none; }
    .lien-vertical::after { content: ""; position: absolute; inset: 0; }
    .lien-vertical:focus-visible { outline: none; }
    .lien-vertical:focus-visible::after { border-radius: 18px; outline: 2px solid #fff; outline-offset: -4px; }
    :host(.verticale) .boutique { font-size: 13px; line-height: 1.25; }
    :host(.verticale) .prix { margin: 0; font-size: 16px; }
    :host(.verticale) .prix .petit { font-size: 13px; }
    @media (prefers-reduced-motion: reduce) { .couverture { transition: none; } }
  `,
})
export class WorkshopVideoComponent {
  private readonly favorites = inject(FavoritesService);
  private readonly player = viewChild.required<ElementRef<HTMLVideoElement>>('player');

  readonly item = input.required<WorkshopVideo>();
  /** « verticale » : tuile 9:16 de 132 × 220 px pour la rangée « En vidéo » du téléphone (A-10d) */
  readonly format = input<'grille' | 'verticale'>('grille');
  readonly vertical = computed(() => this.format() === 'verticale');
  /** Couverture visible dès le premier écran (rangée du téléphone) : demandée en priorité */
  readonly priority = input(false);

  readonly playing = signal(false);
  readonly reduced = signal(false);
  readonly duration = signal<number | null>(null);
  /** Durée « 0:24 », connue dès que les métadonnées de la vidéo sont chargées (à son arrivée à l'écran) */
  readonly durationLabel = computed(() => {
    const d = this.duration();
    if (d === null || !Number.isFinite(d)) return null;
    const s = Math.round(d);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  });
  readonly unit = computed(() => {
    const mode = this.item().product.pricingMode;
    return mode === 'per_m2' ? 'm²' : mode === 'per_linear_m' ? 'm' : null;
  });
  readonly favorite = computed(() => this.favorites.isFavorite(this.item().product.slug));
  /** Pause demandée par la personne : la vidéo ne repart pas toute seule en revenant à l'écran */
  private pausedByUser = false;
  private observer: IntersectionObserver | null = null;
  private pageLoaded = false;
  private coverLoaded = false;

  constructor() {
    const destroyRef = inject(DestroyRef);
    // Code navigateur uniquement, après le premier affichage
    afterNextRender(() => {
      const video = this.player().nativeElement;
      video.muted = true;
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.reduced.set(reduce);
      if (typeof IntersectionObserver === 'undefined') return;
      this.observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          // À l'écran : on charge au moins les métadonnées (durée), et on lit si c'est permis
          if (video.preload === 'none') video.preload = 'metadata';
          if (!reduce && !this.pausedByUser) void video.play().catch(() => undefined);
        } else if (!video.paused) video.pause();
      }, { threshold: 0.5 });
      // A-11 : rien n'est demandé avant la fin du chargement de la page (la vidéo ne dispute pas le réseau aux photos)
      const demarrer = () => { this.pageLoaded = true; this.startWhenReady(); };
      if (document.readyState === 'complete') demarrer();
      else window.addEventListener('load', demarrer, { once: true });
      destroyRef.onDestroy(() => { this.observer?.disconnect(); window.removeEventListener('load', demarrer); });
    });
  }

  /** A-10d : en vertical, la rangée est visible dès le premier écran ; la vidéo attend aussi que sa couverture soit affichée */
  coverDone() {
    this.coverLoaded = true;
    this.startWhenReady();
  }
  private startWhenReady() {
    const coverPending = this.vertical() && !!this.item().product.image && !this.coverLoaded;
    if (this.pageLoaded && !coverPending && this.observer) this.observer.observe(this.player().nativeElement);
  }

  togglePlay() {
    const video = this.player().nativeElement;
    if (video.paused) {
      this.pausedByUser = false;
      void video.play().catch(() => undefined);
    } else {
      this.pausedByUser = true;
      video.pause();
    }
  }

  toggleFavorite() {
    const p = this.item().product;
    this.favorites.toggle({ id: p.id, slug: p.slug, name: p.name, image: p.image, priceTnd: p.priceTnd });
  }
}
