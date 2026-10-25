import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

/** Logo rond d'une boutique ; sans logo, ses initiales sur fond beige (comme le site React). */
@Component({
  selector: 'app-shop-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage],
  template: `
    @if (logoUrl(); as url) {
      <!-- NgOptimizedImage : dimensions fixes connues (aucun décalage), chargement différé -->
      <img [ngSrc]="url" alt="" [width]="size()" [height]="size()" [style.width.px]="size()" [style.height.px]="size()" />
    } @else {
      <span class="initiales" [style.width.px]="size()" [style.height.px]="size()" [style.font-size.px]="size() / 2.6">{{ initials() }}</span>
    }
  `,
  styles: `
    :host { display: inline-flex; flex-shrink: 0; }
    img, .initiales { border-radius: 999px; object-fit: cover; background: var(--beige); }
    .initiales { display: inline-flex; align-items: center; justify-content: center; color: var(--surtitre); font-weight: 700; }
  `,
})
export class ShopLogoComponent {
  readonly name = input.required<string>();
  readonly logoUrl = input<string | null>(null);
  readonly size = input(24);

  readonly initials = computed(() =>
    this.name().split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]!.toUpperCase()).join(''),
  );
}
