import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/** Liens Facebook / Instagram d'une boutique (affichés seulement s'ils sont renseignés), comme ShopSocialLinks en React */
@Component({
  selector: 'app-shop-social-links',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    @if (facebook() || instagram()) {
      <span class="liens">
        @if (facebook()) {
          <a [href]="facebook()" target="_blank" rel="noopener noreferrer nofollow" [attr.aria-label]="'Facebook de ' + shopName()" [title]="'Facebook de ' + shopName()"><app-icon name="facebook" [size]="16" /></a>
        }
        @if (instagram()) {
          <a [href]="instagram()" target="_blank" rel="noopener noreferrer nofollow" [attr.aria-label]="'Instagram de ' + shopName()" [title]="'Instagram de ' + shopName()"><app-icon name="instagram" [size]="16" /></a>
        }
      </span>
    }
  `,
  styles: `
    .liens { display: inline-flex; align-items: center; gap: 6px; }
    a { display: flex; width: 44px; height: 44px; align-items: center; justify-content: center; border: 1px solid #e5dcd4; border-radius: 999px; background: #fff; color: #6d5e54; transition: border-color .2s, color .2s; }
    a:hover { border-color: #c79c77; color: #a16f50; }
  `,
})
export class ShopSocialLinksComponent {
  readonly shopName = input.required<string>();
  readonly facebook = input<string | null>(null);
  readonly instagram = input<string | null>(null);
}
