import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, effect, inject, input, model, output, signal, viewChild } from '@angular/core';

/** Zone choisie, en pixels de l'image d'origine (prête pour canvas.drawImage) */
export interface CropArea { x: number; y: number; width: number; height: number }

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Composant de recadrage RÉUTILISABLE (même comportement que le site React) : l'image se déplace sous un cadre
 * fixe (rond ou rectangle) et se zoome de 1× à 3×. Elle couvre toujours entièrement le cadre (pas de bord vide).
 *
 *   <app-image-cropper [src]="url" [aspect]="16 / 5" shape="rect" [(zoom)]="zoom" (areaChange)="area = $event" />
 *
 * Souris : glisser · molette = zoom. Tactile : glisser · pincer = zoom. Clavier : flèches = déplacer, + / − = zoom.
 */
@Component({
  selector: 'app-image-cropper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #box
      class="zone"
      tabindex="0"
      role="group"
      [attr.aria-label]="label()"
      aria-roledescription="zone de recadrage"
      [attr.aria-describedby]="hintId"
      (pointerdown)="onPointerDown($event)"
      (pointermove)="onPointerMove($event)"
      (pointerup)="onPointerUp($event)"
      (pointercancel)="onPointerUp($event)"
      (wheel)="onWheel($event)"
      (keydown)="onKey($event)"
      data-testid="crop-area"
    >
      <img [src]="src()" alt="" draggable="false" (load)="onImageLoad($event)" [style.left.px]="view()?.left" [style.top.px]="view()?.top" [style.width.px]="view()?.width" [style.height.px]="view()?.height" [class.visible]="!!view()" />
      @let f = frame();
      @if (f) {
        <div class="cadre" [class.rond]="shape() === 'round'" [class.grille]="showGrid()" [style.left.px]="f.left" [style.top.px]="f.top" [style.width.px]="f.width" [style.height.px]="f.height" aria-hidden="true"></div>
      }
      <span class="masque" [id]="hintId">Glissez l'image ou utilisez les flèches du clavier pour la déplacer ; molette, pincement ou touches plus et moins pour zoomer.</span>
    </div>
  `,
  styles: `
    :host { display: block; height: 100%; }
    .zone { position: relative; height: 100%; min-height: 260px; overflow: hidden; background: #241e1a; cursor: grab; touch-action: none; user-select: none; }
    .zone:active { cursor: grabbing; }
    .zone:focus-visible { outline: 3px solid #c79c77; outline-offset: -3px; }
    img { position: absolute; max-width: none; opacity: 0; pointer-events: none; }
    img.visible { opacity: 1; }
    /* Tout ce qui est hors du cadre est assombri, comme sur le site React */
    .cadre { position: absolute; border: 1px solid rgba(255, 255, 255, 0.85); box-shadow: 0 0 0 9999px rgba(36, 30, 26, 0.6); pointer-events: none; }
    .cadre.rond { border-radius: 50%; }
    .cadre.grille {
      background-image:
        linear-gradient(to right, transparent calc(33.33% - 0.5px), rgba(255, 255, 255, 0.45) calc(33.33% - 0.5px), rgba(255, 255, 255, 0.45) calc(33.33% + 0.5px), transparent calc(33.33% + 0.5px), transparent calc(66.66% - 0.5px), rgba(255, 255, 255, 0.45) calc(66.66% - 0.5px), rgba(255, 255, 255, 0.45) calc(66.66% + 0.5px), transparent calc(66.66% + 0.5px)),
        linear-gradient(to bottom, transparent calc(33.33% - 0.5px), rgba(255, 255, 255, 0.45) calc(33.33% - 0.5px), rgba(255, 255, 255, 0.45) calc(33.33% + 0.5px), transparent calc(33.33% + 0.5px), transparent calc(66.66% - 0.5px), rgba(255, 255, 255, 0.45) calc(66.66% - 0.5px), rgba(255, 255, 255, 0.45) calc(66.66% + 0.5px), transparent calc(66.66% + 0.5px));
    }
    .masque { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  `,
})
export class ImageCropperComponent {
  private static nextId = 0;
  readonly hintId = `aide-recadrage-${ImageCropperComponent.nextId++}`;

  /** Adresse de l'image à recadrer (URL.createObjectURL du fichier choisi) */
  readonly src = input.required<string>();
  /** Rapport largeur / hauteur du résultat (1 pour un logo, 1600 / 500 pour une couverture) */
  readonly aspect = input(1);
  readonly shape = input<'round' | 'rect'>('rect');
  readonly showGrid = input(false);
  readonly disabled = input(false);
  readonly label = input("Zone de recadrage de l'image");
  /** Zoom lié dans les deux sens avec le parent : [(zoom)]="zoom" (curseur et boutons ± du parent) */
  readonly zoom = model(1);
  /** Émis à chaque déplacement / zoom : la zone choisie en pixels de l'image d'origine */
  readonly areaChange = output<CropArea>();

  private readonly box = viewChild.required<ElementRef<HTMLDivElement>>('box');
  private readonly boxSize = signal({ width: 0, height: 0 });
  private readonly natural = signal<{ width: number; height: number } | null>(null);
  /** Centre de la zone choisie, en pixels de l'image d'origine (indépendant de la taille de l'écran) */
  private readonly center = signal<{ x: number; y: number } | null>(null);

  /** Cadre : le plus grand rectangle au bon rapport qui tient dans la zone, avec une marge */
  readonly frame = computed(() => {
    const { width, height } = this.boxSize();
    if (!width || !height) return null;
    const margin = width < 480 ? 16 : 32;
    const frameWidth = Math.min(width - 2 * margin, (height - 2 * margin) * this.aspect());
    const frameHeight = frameWidth / this.aspect();
    return { width: frameWidth, height: frameHeight, left: (width - frameWidth) / 2, top: (height - frameHeight) / 2 };
  });

  /** Échelle d'affichage : à 1×, l'image couvre exactement le cadre */
  private readonly scale = computed(() => {
    const f = this.frame();
    const n = this.natural();
    return f && n ? Math.max(f.width / n.width, f.height / n.height) * clamp(this.zoom(), MIN_ZOOM, MAX_ZOOM) : null;
  });

  /** Centre ramené dans les limites : la zone choisie reste toujours entièrement dans l'image */
  private readonly safeCenter = computed(() => {
    const f = this.frame();
    const n = this.natural();
    const s = this.scale();
    if (!f || !n || !s) return null;
    const halfW = f.width / s / 2;
    const halfH = f.height / s / 2;
    const c = this.center() ?? { x: n.width / 2, y: n.height / 2 };
    return { x: clamp(c.x, halfW, n.width - halfW), y: clamp(c.y, halfH, n.height - halfH) };
  });

  /** Position et taille de l'image à l'écran */
  readonly view = computed(() => {
    const f = this.frame();
    const n = this.natural();
    const s = this.scale();
    const c = this.safeCenter();
    if (!f || !n || !s || !c) return null;
    return { left: f.left + f.width / 2 - c.x * s, top: f.top + f.height / 2 - c.y * s, width: n.width * s, height: n.height * s };
  });

  /** Zone choisie, en pixels de l'image d'origine */
  readonly area = computed<CropArea | null>(() => {
    const f = this.frame();
    const s = this.scale();
    const c = this.safeCenter();
    if (!f || !s || !c) return null;
    const width = f.width / s;
    const height = f.height / s;
    return { x: Math.round(c.x - width / 2), y: Math.round(c.y - height / 2), width: Math.round(width), height: Math.round(height) };
  });

  private readonly pointers = new Map<number, { x: number; y: number }>();
  private pinchStart: { distance: number; zoom: number } | null = null;

  constructor() {
    // Prévient le parent à chaque changement de zone
    effect(() => {
      const area = this.area();
      if (area) this.areaChange.emit(area);
    });
    // Taille de la zone suivie en continu (rotation du téléphone, fenêtre redimensionnée)
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const element = this.box().nativeElement;
      const observer = new ResizeObserver(([entry]) => this.boxSize.set({ width: entry.contentRect.width, height: entry.contentRect.height }));
      observer.observe(element);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  onImageLoad(event: Event) {
    const img = event.target as HTMLImageElement;
    this.natural.set({ width: img.naturalWidth, height: img.naturalHeight });
    this.center.set(null); // nouvelle image : centrée
  }

  /** Déplace l'image de (dx, dy) pixels écran : la zone choisie part dans l'autre sens */
  private moveBy(dx: number, dy: number) {
    const c = this.safeCenter();
    const s = this.scale();
    if (!c || !s || this.disabled()) return;
    this.center.set({ x: c.x - dx / s, y: c.y - dy / s });
  }

  private setZoom(value: number) {
    if (this.disabled()) return;
    const c = this.safeCenter();
    if (c) this.center.set(c); // le zoom garde le même centre
    this.zoom.set(Math.round(clamp(value, MIN_ZOOM, MAX_ZOOM) * 100) / 100);
  }

  onPointerDown(event: PointerEvent) {
    if (this.disabled()) return;
    this.box().nativeElement.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.pointers.size === 2) this.pinchStart = { distance: this.pointerDistance(), zoom: this.zoom() };
  }

  onPointerMove(event: PointerEvent) {
    const previous = this.pointers.get(event.pointerId);
    if (!previous) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.pointers.size === 2 && this.pinchStart) {
      // Pincer : le zoom suit l'écart entre les deux doigts
      this.setZoom(this.pinchStart.zoom * (this.pointerDistance() / this.pinchStart.distance));
    } else if (this.pointers.size === 1) {
      this.moveBy(event.clientX - previous.x, event.clientY - previous.y);
    }
  }

  onPointerUp(event: PointerEvent) {
    this.pointers.delete(event.pointerId);
    if (this.pointers.size < 2) this.pinchStart = null;
  }

  onWheel(event: WheelEvent) {
    event.preventDefault();
    this.setZoom(this.zoom() - event.deltaY * 0.002);
  }

  onKey(event: KeyboardEvent) {
    const step = event.shiftKey ? 40 : 10;
    // La flèche déplace l'image dans sa direction
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[event.key]) {
      event.preventDefault();
      this.moveBy(...moves[event.key]);
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      this.setZoom(this.zoom() + 0.1);
    } else if (event.key === '-') {
      event.preventDefault();
      this.setZoom(this.zoom() - 0.1);
    }
  }

  private pointerDistance() {
    const [a, b] = Array.from(this.pointers.values());
    return Math.hypot(a.x - b.x, a.y - b.y) || 1;
  }
}
