import { ChangeDetectionStrategy, Component, ElementRef, computed, input, signal, viewChild } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

export interface ViewerPhoto { url: string; caption: string }

/**
 * Visionneuse plein écran : <dialog> natif (Échap ferme, focus enfermé, retour du focus à l'élément d'origine),
 * flèches ← → pour passer d'une photo à l'autre, boutons de 44 px.
 */
@Component({
  selector: 'app-photo-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: { '(keydown.arrowleft)': 'move(-1)', '(keydown.arrowright)': 'move(1)' },
  template: `
    <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -- clic sur le fond du <dialog> ; au clavier : Échap (natif) -->
    <dialog #dialog class="visionneuse" [attr.aria-label]="title()" (click)="onBackdrop($event)" (close)="opened.set(false)" data-testid="photo-viewer">
      @if (current(); as photo) {
        <figure>
          <img [src]="photo.url" [alt]="photo.caption" />
          <figcaption>{{ photo.caption }} <span class="compteur">{{ index() + 1 }} / {{ photos().length }}</span></figcaption>
        </figure>
        @if (photos().length > 1) {
          <button type="button" class="nav precedent" aria-label="Photo précédente" (click)="move(-1)"><app-icon name="arrow-left" /></button>
          <button type="button" class="nav suivant" aria-label="Photo suivante" (click)="move(1)"><app-icon name="arrow-right" /></button>
        }
        <button type="button" class="fermer" aria-label="Fermer la visionneuse" (click)="close()" autofocus><app-icon name="x" /></button>
      }
    </dialog>
  `,
  styles: `
    .visionneuse { width: 100vw; max-width: 100vw; height: 100dvh; max-height: 100dvh; margin: 0; padding: 0; border: none; background: rgba(20, 16, 13, 0.94); color: #fff; }
    .visionneuse::backdrop { background: rgba(20, 16, 13, 0.6); }
    figure { display: flex; height: 100%; margin: 0; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 64px 16px 24px; }
    img { max-width: 100%; max-height: calc(100dvh - 140px); border-radius: 12px; object-fit: contain; }
    figcaption { font-size: 14px; text-align: center; }
    .compteur { margin-left: 8px; opacity: 0.7; }
    .nav, .fermer { position: absolute; display: flex; width: 48px; height: 48px; align-items: center; justify-content: center; padding: 0; border: none; border-radius: 999px; background: rgba(255, 255, 255, 0.14); color: #fff; cursor: pointer; }
    .nav:hover, .fermer:hover { background: rgba(255, 255, 255, 0.26); }
    .nav:focus-visible, .fermer:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
    .precedent { top: 50%; left: 12px; transform: translateY(-50%); }
    .suivant { top: 50%; right: 12px; transform: translateY(-50%); }
    .fermer { top: 12px; right: 12px; }
  `,
})
export class PhotoViewerComponent {
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  readonly photos = input.required<readonly ViewerPhoto[]>();
  readonly title = input('Photos des clients');
  readonly index = signal(0);
  readonly opened = signal(false);
  readonly current = computed(() => (this.opened() ? this.photos()[this.index()] ?? null : null));

  open(index: number) {
    this.index.set(index);
    this.opened.set(true);
    this.dialog().nativeElement.showModal();
  }
  close() {
    const d = this.dialog().nativeElement;
    if (d.open) d.close();
  }
  move(step: number) {
    const count = this.photos().length;
    if (!this.opened() || count < 2) return;
    this.index.update((i) => (i + step + count) % count);
  }
  onBackdrop(event: MouseEvent) {
    if (event.target === this.dialog().nativeElement) this.close();
  }
}
