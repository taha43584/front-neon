import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
// Mêmes règles que le serveur (qui revérifie) : importées depuis shared/, pas recopiées
import { normalizeFacebookUrl, normalizeInstagramUrl } from '@shared/shopValidation';
import { socialLinkValidator } from '../../shared/validators/social-link.validator';
import { VendorSpaceState } from './vendor-space.state';
import { VendorService } from '../../core/services/vendor.service';
import { ShopImagesEditorComponent } from './shop-images/shop-images-editor.component';

const text = (max: number, ...validators: ValidatorFn[]) => new FormControl('', { nonNullable: true, validators: [Validators.maxLength(max), ...validators] });

/**
 * Ma boutique : photo de profil et couverture (recadrage), puis informations affichées sur la page publique.
 * Le statut de la boutique est géré par l'administration et ne fait pas partie du formulaire.
 */
@Component({
  selector: 'app-vendor-shop-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, ShopImagesEditorComponent],
  templateUrl: './vendor-shop.page.html',
  styleUrls: ['./vendor-pages.css', './vendor-shop.page.css'],
})
export class VendorShopPage {
  readonly state = inject(VendorSpaceState);
  private readonly vendor = inject(VendorService);

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2), Validators.maxLength(191)] }),
    tagline: text(500),
    about: text(2000),
    city: text(128),
    openingHours: text(191),
    phone: text(64),
    whatsapp: text(64),
    address: text(500),
    deliveryInfo: text(2000),
    socialFacebook: text(400, socialLinkValidator(normalizeFacebookUrl)),
    socialInstagram: text(400, socialLinkValidator(normalizeInstagramUrl)),
    socialWebsite: text(191),
  });

  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly message = signal<{ text: string; error: boolean } | null>(null);

  constructor() {
    // Le formulaire est rempli avec les données de la boutique (une seule fois : on n'écrase pas une saisie en cours)
    let filled = false;
    effect(() => {
      const shop = this.state.shop();
      if (!shop || filled) return;
      filled = true;
      untracked(() =>
        this.form.reset({
          name: shop.name, tagline: shop.tagline ?? '', about: shop.about ?? '', city: shop.city ?? '', openingHours: shop.openingHours ?? '',
          phone: shop.phone ?? '', whatsapp: shop.whatsapp ?? '', address: shop.address ?? '', deliveryInfo: shop.deliveryInfo ?? '',
          socialFacebook: shop.socialFacebook ?? '', socialInstagram: shop.socialInstagram ?? '', socialWebsite: shop.socialWebsite ?? '',
        }),
      );
    });
  }

  /** Message d'erreur d'un champ, affiché après le premier envoi ou dès que le champ a été modifié */
  error(name: keyof typeof this.form.controls): string | null {
    const control = this.form.controls[name];
    if (!control.errors || !(this.submitted() || control.dirty)) return null;
    if (control.errors['social']) return control.errors['social'] as string;
    if (control.errors['required'] || control.errors['minlength']) return 'Le nom de la boutique doit comporter au moins 2 caractères';
    if (control.errors['maxlength']) return `${control.errors['maxlength'].requiredLength} caractères maximum`;
    return null;
  }

  async submit() {
    this.submitted.set(true);
    this.message.set(null);
    if (this.form.invalid) {
      const social = this.form.controls.socialFacebook.invalid || this.form.controls.socialInstagram.invalid;
      this.message.set({ text: social ? 'Vérifiez vos liens Facebook / Instagram' : 'Vérifiez les champs signalés', error: true });
      return;
    }
    const v = this.form.getRawValue();
    const trimmed = Object.fromEntries(Object.entries(v).map(([key, value]) => [key, value.trim()])) as typeof v;
    this.saving.set(true);
    try {
      await this.vendor.updateShop(trimmed);
      await this.state.reload(); // le nom affiché en haut de l'espace vendeur suit immédiatement
      this.form.markAsPristine();
      this.message.set({ text: 'Boutique mise à jour', error: false });
    } catch (error) {
      this.message.set({ text: error instanceof Error ? error.message : 'Erreur lors de la mise à jour', error: true });
    } finally {
      this.saving.set(false);
    }
  }
}
