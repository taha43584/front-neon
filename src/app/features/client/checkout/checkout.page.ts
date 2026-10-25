import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AccountService } from '../../../core/services/account.service';
import { CartQuote, CartService } from '../../../core/services/cart.service';
import { GOVERNORATES, normalizeTunisianPhone, splitCity, tunisianPhoneValidator } from '../../../shared/validators/tunisian-phone.validator';
import { PrixDtPipe } from '../../../shared/pipes/prix-dt.pipe';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/**
 * Finaliser la commande (page protégée par authGuard).
 * Formulaire réactif : nom, téléphone tunisien (8 chiffres), ville / délégation, gouvernorat, adresse, note, confirmation.
 * Le total affiché vient du serveur ; le serveur le recalcule encore au moment d'enregistrer la commande.
 */
@Component({
  selector: 'app-checkout-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, PrixDtPipe, IconComponent],
  templateUrl: './checkout.page.html',
  styleUrl: './checkout.page.css',
})
export class CheckoutPage implements OnInit {
  readonly auth = inject(AuthService);
  readonly cart = inject(CartService);
  private readonly account = inject(AccountService);
  private readonly router = inject(Router);

  readonly governorates = GOVERNORATES;
  readonly quote = signal<CartQuote | null>(null);
  readonly quoteError = signal(false);
  readonly sending = signal(false);
  readonly serverError = signal('');

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required, tunisianPhoneValidator] }),
    city: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    governorate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    address: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(5)] }),
    note: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(2000)] }),
    /** Case « Je confirme… » : obligatoire (requiredTrue) */
    confirmed: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
  });

  /** Numéro tel qu'il sera envoyé (8 chiffres), affiché dans « Vérifiez vos coordonnées » */
  normalizedPhone() {
    return normalizeTunisianPhone(this.form.controls.phone.value);
  }

  readonly canOrder = computed(() => this.auth.isCustomer() && !!this.quote() && !this.quote()!.hasProblems);

  ngOnInit() {
    if (this.cart.isEmpty()) return;
    // Prix vérifiés par le serveur pour le récapitulatif
    this.cart.quote().then((q) => this.quote.set(q)).catch(() => this.quoteError.set(true));
    void this.prefill();
  }

  constructor() {
    // Toute modification du téléphone ou de l'adresse oblige à reconfirmer
    for (const name of ['phone', 'city', 'governorate', 'address'] as const) {
      this.form.controls[name].valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.form.controls.confirmed.setValue(false));
    }
  }

  /** Pré-remplissage avec le profil et l'adresse principale enregistrés (comptes Client) */
  private async prefill() {
    const user = this.auth.user();
    if (!user || user.role !== 'user') return;
    let saved: { recipientName: string; phone: string; addressLine: string; city: string } | undefined;
    try {
      const dashboard = await this.account.dashboard();
      saved = dashboard.addresses.find((a) => a.isDefault) ?? dashboard.addresses[0];
    } catch {
      /* pas d'adresse enregistrée : on garde le profil */
    }
    // « Hammam Sousse, Sousse » → ville + gouvernorat ; « Sousse » → gouvernorat seul
    const { city, governorate } = splitCity(saved?.city || user.city);
    this.form.patchValue({
      name: saved?.recipientName || user.name || '',
      phone: saved?.phone || user.phone || '',
      address: saved?.addressLine || user.address || '',
      city,
      governorate,
    }, { emitEvent: false });
  }

  /** Message d'erreur d'un champ, seulement après que l'utilisateur l'a touché */
  error(name: keyof typeof this.form.controls): string | null {
    const control = this.form.controls[name];
    if (!control.touched || control.valid) return null;
    if (control.hasError('required')) {
      return { name: 'Le nom du destinataire est requis.', phone: 'Le numéro de téléphone est requis.', city: 'Indiquez votre ville ou délégation.', governorate: 'Choisissez votre gouvernorat.', address: "L'adresse de livraison est requise.", note: '', confirmed: 'Confirmez vos coordonnées.' }[name];
    }
    if (control.hasError('tunisianPhone')) return 'Numéro tunisien invalide : 8 chiffres (ex. 20 123 456 ou +216 20 123 456).';
    if (control.hasError('minlength')) return name === 'address' ? "L'adresse doit comporter au moins 5 caractères." : name === 'city' ? 'La ville doit comporter au moins 2 caractères.' : 'Au moins 2 caractères.';
    if (control.hasError('maxlength')) return 'Texte trop long (2000 caractères maximum).';
    return null;
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.sending.set(true);
    this.serverError.set('');
    try {
      const result = await this.account.createOrder(this.cart.items(), this.form.getRawValue());
      if (!result.orderId) throw new Error("La commande n'a pas pu être enregistrée.");
      this.cart.clear();
      await this.router.navigate(['/commande', result.orderId]);
    } catch (error) {
      // Message du serveur (stock épuisé, mesures refusées, compte non Client…)
      this.serverError.set(error instanceof Error && error.message ? error.message : "Impossible d'enregistrer la commande. Réessayez.");
      this.sending.set(false);
    }
  }
}
