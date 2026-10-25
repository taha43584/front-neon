import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { normalizeFacebookUrl, normalizeInstagramUrl } from '@shared/shopValidation';
import { socialLinkValidator } from '../../../shared/validators/social-link.validator';
import { VendorService, VendorShop } from '../../../core/services/vendor.service';
import { ShopImagesEditorComponent } from '../shop-images/shop-images-editor.component';

const text = (max: number, ...validators: ValidatorFn[]) => new FormControl('', { nonNullable: true, validators: [Validators.maxLength(max), ...validators] });

/**
 * Demande vendeur (procédure existante vendor.applyShop) : première demande, demande en attente
 * ou demande refusée à corriger. L'administration valide ensuite la boutique.
 */
@Component({
  selector: 'app-shop-application-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ShopImagesEditorComponent],
  templateUrl: './shop-application-form.component.html',
  styleUrl: './shop-application-form.component.css',
})
export class ShopApplicationFormComponent implements OnInit {
  private readonly vendor = inject(VendorService);

  /** Boutique existante (demande en attente ou refusée) : formulaire pré-rempli */
  readonly shop = input<VendorShop | null>(null);
  readonly editing = input(false);
  readonly done = output<void>();

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2), Validators.maxLength(191)] }),
    tagline: text(500),
    about: text(2000),
    phone: text(64),
    city: text(128),
    address: text(500),
    openingHours: text(191),
    socialInstagram: text(400, socialLinkValidator(normalizeInstagramUrl)),
    socialFacebook: text(400, socialLinkValidator(normalizeFacebookUrl)),
    socialWebsite: text(191),
  });

  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly message = signal<{ text: string; error: boolean } | null>(null);

  ngOnInit() {
    const shop = this.shop();
    if (shop) {
      this.form.reset({
        name: shop.name, tagline: shop.tagline ?? '', about: shop.about ?? '', phone: shop.phone ?? '', city: shop.city ?? '',
        address: shop.address ?? '', openingHours: shop.openingHours ?? '', socialInstagram: shop.socialInstagram ?? '',
        socialFacebook: shop.socialFacebook ?? '', socialWebsite: shop.socialWebsite ?? '',
      });
    }
  }

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
      this.message.set({ text: 'Vérifiez les champs signalés', error: true });
      return;
    }
    // Champs vides → non envoyés (comme le site React)
    const values = Object.fromEntries(
      Object.entries(this.form.getRawValue()).map(([key, value]) => [key, value.trim() || undefined]),
    ) as { name: string } & Record<string, string | undefined>;
    this.saving.set(true);
    try {
      await this.vendor.applyShop(values);
      this.message.set({ text: this.editing() ? 'Informations de la boutique mises à jour' : 'Votre demande pour devenir vendeur a été envoyée !', error: false });
      this.done.emit();
    } catch (error) {
      this.message.set({ text: error instanceof Error ? error.message : "Une erreur est survenue lors de l'envoi de votre demande", error: true });
    } finally {
      this.saving.set(false);
    }
  }
}
