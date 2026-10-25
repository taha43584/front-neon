import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ICONS, IconName } from './icons';

/**
 * Icône Lucide (mêmes dessins que le site React) : <app-icon name="heart" [size]="20" />.
 * Décorative par défaut (aria-hidden) : le texte ou l'aria-label du bouton qui la contient la nomme.
 * Les tracés sont dessinés par liaison d'attributs ([attr.d]…), sans innerHTML.
 */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" [attr.width]="size()" [attr.height]="size()" [attr.fill]="filled() ? 'currentColor' : 'none'" stroke="currentColor"
      [attr.stroke-width]="strokeWidth()" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
      @for (node of nodes(); track $index) {
        @let a = node[1];
        @switch (node[0]) {
          @case ('path') { <path [attr.d]="a['d']" /> }
          @case ('circle') { <circle [attr.cx]="a['cx']" [attr.cy]="a['cy']" [attr.r]="a['r']" /> }
          @case ('rect') { <rect [attr.x]="a['x']" [attr.y]="a['y']" [attr.width]="a['width']" [attr.height]="a['height']" [attr.rx]="a['rx']" [attr.ry]="a['ry']" /> }
          @case ('line') { <line [attr.x1]="a['x1']" [attr.y1]="a['y1']" [attr.x2]="a['x2']" [attr.y2]="a['y2']" /> }
          @case ('polyline') { <polyline [attr.points]="a['points']" /> }
          @case ('polygon') { <polygon [attr.points]="a['points']" /> }
        }
      }
    </svg>
  `,
  styles: `:host { display: inline-flex; flex-shrink: 0; line-height: 0; } svg { display: block; }`,
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input(20);
  readonly strokeWidth = input(2);
  /** Icône remplie (ex. cœur d'un favori actif) */
  readonly filled = input(false);
  readonly nodes = computed(() => ICONS[this.name()] as readonly (readonly [string, Readonly<Record<string, string>>])[]);
}
