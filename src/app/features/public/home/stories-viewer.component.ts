import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CatalogProduct } from '../../../core/services/catalog.service';
import { ViewportService } from '../../../core/services/viewport.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PrixDtPipe } from '../../../shared/pipes/prix-dt.pipe';
import { ShopLogoComponent } from '../../../shared/components/shop-logo/shop-logo.component';

/** Un élément de story : un produit publié, montré par sa vidéo (s'il en a une) ou sa photo */
export interface StoryItem { product: CatalogProduct; video: { url: string; mimeType: string } | null }
export interface StoryGroup { shop: { slug: string; name: string; logoUrl: string | null }; items: StoryItem[] }

/** Durée d'une photo */
const PHOTO_MS = 4000;
/** Glisser vers le bas de plus de… pour fermer */
const SWIPE_CLOSE_PX = 90;

/**
 * Visionneuse plein écran des stories des ateliers (A-10e). <dialog> modal : Échap ou ✕ = fermer, glisser vers le bas = fermer.
 * Toucher la moitié droite = suivant, la gauche = précédent (deux vrais boutons, nommés pour les lecteurs d'écran).
 * Avancement automatique : 4 s par photo, durée réelle d'une vidéo (muette) ; à la fin d'un atelier, l'atelier suivant.
 * « Réduire les animations » : rien n'avance tout seul, la vidéo ne démarre pas d'elle-même, boutons Précédent / Suivant visibles.
 */
@Component({
  selector: 'app-stories-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, RouterLink, IconComponent, PrixDtPipe, ShopLogoComponent],
  template: `
    <!-- eslint-disable-next-line @angular-eslint/template/interactive-supports-focus -- le <dialog> reçoit les touches (flèches) et le geste de fermeture qui remontent de ses boutons ; au clavier : Échap, ✕, Précédent / Suivant -->
    <dialog #fenetre class="visionneuse" [attr.aria-label]="'Story de ' + group().shop.name" (close)="closed.emit()" (keydown)="onKey($event)"
      (pointerdown)="onPointerDown($event)" (pointerup)="onPointerUp($event)" data-testid="stories-viewer">
      @let it = item();
      <div class="barres" aria-hidden="true">
        @for (x of group().items; track x.product.slug; let i = $index) {
          <span class="barre">
            <span class="plein" [class.fait]="i < index()"
              [class.encours]="i === index() && !reduced() && !it.video" [style.animation-duration.ms]="photoMs"
              [style.width.%]="i === index() && it.video ? videoProgress() * 100 : null"
              (animationend)="i === index() && next()"></span>
          </span>
        }
      </div>
      <div class="haut">
        <app-shop-logo [name]="group().shop.name" [logoUrl]="group().shop.logoUrl" [size]="32" />
        <span class="atelier">{{ group().shop.name }}</span>
        <span class="compteur" aria-live="polite">{{ index() + 1 }} / {{ group().items.length }}</span>
        <button type="button" class="rond" aria-label="Fermer la story" (click)="close()" data-testid="stories-close"><app-icon name="x" [size]="20" /></button>
      </div>

      @for (k of [it.product.slug]; track k) {
        <div class="media">
          @if (it.video; as v) {
            <video #lecteur [muted]="true" muted playsinline preload="auto" [autoplay]="!reduced()" [src]="v.url" (loadedmetadata)="onMeta()" (timeupdate)="onTime()" (ended)="next()" aria-hidden="true"></video>
          } @else if (it.product.image; as img) {
            <img [ngSrc]="img" [alt]="it.product.name" fill sizes="100vw" priority />
          }
        </div>
      }

      <!-- Zones de toucher : gauche = précédent, droite = suivant -->
      <button type="button" class="zone gauche" aria-label="Élément précédent" (click)="previous()"></button>
      <button type="button" class="zone droite" aria-label="Élément suivant" (click)="next()"></button>

      <div class="bas">
        <p class="nom">{{ it.product.name }}</p>
        <p class="prix">@if (unit(it.product)) { <span class="petit">dès </span> }<strong>{{ it.product.priceTnd | prixDt }}</strong>@if (unit(it.product)) {<span class="petit"> / {{ unit(it.product) }}</span>}</p>
        <a class="voir" [routerLink]="['/produit', it.product.slug]" (click)="close()" data-testid="stories-product">Voir le produit</a>
        @if (reduced()) {
          <div class="boutons-reduits">
            <button type="button" class="texte" (click)="previous()" [disabled]="groupIndex() === 0 && index() === 0">← Précédent</button>
            <button type="button" class="texte" (click)="next()">Suivant →</button>
          </div>
        }
      </div>
    </dialog>
  `,
  styles: `
    .visionneuse { width: 100%; max-width: 100%; height: 100%; max-height: 100%; margin: 0; padding: 0; border: none; background: #000; color: #fff; overflow: hidden; touch-action: pan-x; }
    .visionneuse::backdrop { background: #000; }
    .visionneuse[open] { animation: entree .25s ease; }
    @keyframes entree { from { opacity: 0; transform: scale(.96); } }
    .barres { position: absolute; top: calc(8px + env(safe-area-inset-top)); right: 10px; left: 10px; z-index: 3; display: flex; gap: 4px; }
    .barre { height: 3px; flex: 1; overflow: hidden; border-radius: 2px; background: rgba(255, 255, 255, .35); }
    .plein { display: block; width: 0; height: 100%; background: #fff; }
    .plein.fait { width: 100%; }
    .plein.encours { animation: avance linear forwards; }
    @keyframes avance { from { width: 0; } to { width: 100%; } }
    .haut { position: absolute; top: calc(18px + env(safe-area-inset-top)); right: 6px; left: 12px; z-index: 3; display: flex; align-items: center; gap: 10px; }
    .atelier { min-width: 0; flex: 1; overflow: hidden; font-size: 14px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; text-shadow: 0 1px 3px rgba(0, 0, 0, .6); }
    .compteur { font-size: 12px; opacity: .85; }
    .rond { display: flex; width: 44px; height: 44px; align-items: center; justify-content: center; border: none; border-radius: 999px; background: rgba(0, 0, 0, .35); color: #fff; cursor: pointer; }
    .media { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
    .media img { object-fit: contain; }
    .media video { width: 100%; height: 100%; object-fit: contain; }
    .zone { position: absolute; top: 80px; bottom: 170px; z-index: 2; width: 50%; padding: 0; border: none; background: none; cursor: pointer; }
    .zone.gauche { left: 0; }
    .zone.droite { right: 0; }
    .zone:focus-visible { outline: 3px solid #fff; outline-offset: -6px; }
    .bas { position: absolute; right: 0; bottom: 0; left: 0; z-index: 3; padding: 48px 16px calc(18px + env(safe-area-inset-bottom)); background: linear-gradient(transparent, rgba(0, 0, 0, .75)); }
    .nom { margin: 0; font-family: var(--police-titre); font-size: 22px; line-height: 1.2; }
    .prix { margin: 4px 0 12px; font-size: 16px; }
    .petit { font-size: 13px; opacity: .85; }
    .voir { display: flex; min-height: 50px; align-items: center; justify-content: center; border-radius: 999px; background: #fff; color: #2a2420; font-weight: 700; text-decoration: none; }
    .voir:focus-visible, .rond:focus-visible, .texte:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
    .boutons-reduits { display: flex; justify-content: space-between; gap: 12px; margin-top: 10px; }
    .texte { min-height: 44px; padding: 0 12px; border: 1px solid rgba(255, 255, 255, .6); border-radius: 999px; background: none; color: #fff; font: 600 14px var(--police-texte); cursor: pointer; }
    .texte:disabled { opacity: .4; }
    @media (prefers-reduced-motion: reduce) { .visionneuse[open] { animation: none; } }
  `,
})
export class StoriesViewerComponent {
  private readonly viewport = inject(ViewportService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('fenetre');
  private readonly player = viewChild<ElementRef<HTMLVideoElement>>('lecteur');

  readonly groups = input.required<StoryGroup[]>();
  /** Atelier ouvert au départ */
  readonly start = input(0);
  readonly closed = output();
  /** Élément affiché : signalé pour marquer l'atelier « vu » */
  readonly seen = output<{ shop: string; product: string }>();

  readonly photoMs = PHOTO_MS;
  readonly reduced = this.viewport.reducedMotion;
  readonly groupIndex = signal(0);
  readonly index = signal(0);
  readonly videoProgress = signal(0);
  readonly group = computed(() => this.groups()[this.groupIndex()]);
  readonly item = computed(() => this.group().items[this.index()]);
  private startY: number | null = null;

  constructor() {
    afterNextRender(() => {
      this.groupIndex.set(Math.min(this.start(), this.groups().length - 1));
      this.dialog().nativeElement.showModal();
    });
    effect(() => {
      const it = this.item();
      this.videoProgress.set(0);
      this.seen.emit({ shop: this.group().shop.slug, product: it.product.slug });
    });
  }

  unit(p: CatalogProduct) {
    return p.pricingMode === 'per_m2' ? 'm²' : p.pricingMode === 'per_linear_m' ? 'm' : null;
  }

  next() {
    if (this.index() < this.group().items.length - 1) this.index.update((i) => i + 1);
    else if (this.groupIndex() < this.groups().length - 1) { this.groupIndex.update((g) => g + 1); this.index.set(0); }
    else this.close();
  }
  previous() {
    if (this.index() > 0) this.index.update((i) => i - 1);
    else if (this.groupIndex() > 0) { this.groupIndex.update((g) => g - 1); this.index.set(this.group().items.length - 1); }
  }
  close() {
    const d = this.dialog().nativeElement;
    if (d.open) d.close();
  }

  onMeta() {
    this.videoProgress.set(0);
  }
  onTime() {
    const v = this.player()?.nativeElement;
    if (v && v.duration > 0) this.videoProgress.set(v.currentTime / v.duration);
  }
  onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowRight') this.next();
    else if (e.key === 'ArrowLeft') this.previous();
  }
  /** Glisser vers le bas = fermer */
  onPointerDown(e: PointerEvent) {
    this.startY = e.clientY;
  }
  onPointerUp(e: PointerEvent) {
    if (this.startY !== null && e.clientY - this.startY > SWIPE_CLOSE_PX) this.close();
    this.startY = null;
  }
}
