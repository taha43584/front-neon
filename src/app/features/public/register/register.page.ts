import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
// Règles PARTAGÉES avec le serveur et le site React (importées, pas recopiées)
import { VENDOR_TERMS_PATH, customerRegistrationSchema, fieldErrors, vendorRegistrationSchema } from '@shared/validation';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import type { IconName } from '../../../shared/components/icon/icons';

type Mode = 'choice' | 'client' | 'vendor';
interface Field { name: string; label: string; type?: string; autocomplete?: string; placeholder?: string; hint?: string }

const CLIENT_FIELDS: Field[] = [
  { name: 'lastName', label: 'Nom', autocomplete: 'family-name', placeholder: 'Ben Ali' },
  { name: 'firstName', label: 'Prénom', autocomplete: 'given-name', placeholder: 'Sami' },
  { name: 'email', label: 'Adresse e-mail', type: 'email', autocomplete: 'email', placeholder: 'sami@email.tn' },
  { name: 'phone', label: 'Numéro de téléphone', type: 'tel', autocomplete: 'tel', placeholder: '+216 20 123 456' },
  { name: 'city', label: 'Ville / Localisation', autocomplete: 'address-level2', placeholder: 'Tunis' },
  { name: 'address', label: 'Adresse de livraison', autocomplete: 'street-address', placeholder: 'Rue, quartier, repère' },
];
const VENDOR_PERSON: Field[] = [
  { name: 'lastName', label: 'Nom', autocomplete: 'family-name', placeholder: 'Trabelsi' },
  { name: 'firstName', label: 'Prénom', autocomplete: 'given-name', placeholder: 'Amira' },
  { name: 'email', label: 'Adresse e-mail', type: 'email', autocomplete: 'email', placeholder: 'atelier@email.tn' },
  { name: 'phone', label: 'Numéro de téléphone', type: 'tel', autocomplete: 'tel', placeholder: '+216 50 123 456' },
  { name: 'city', label: 'Localisation', autocomplete: 'address-level2', placeholder: 'Nabeul' },
];
const VENDOR_SHOP: Field[] = [
  { name: 'shopName', label: 'Nom de la page ou de la boutique', placeholder: 'Atelier Céramique Nabeul' },
  { name: 'whatsapp', label: 'Numéro WhatsApp', type: 'tel', placeholder: '+216 50 123 456', hint: "Utilisé pour les échanges avec l'administration et les clients" },
];

const CHOICES: { href: string; icon: IconName; title: string; text: string; points: string[]; cta: string; dark: boolean }[] = [
  {
    href: '/inscription/client', icon: 'shopping-bag', title: 'Créer un compte Client',
    text: 'Pour commander des créations, suivre vos commandes et enregistrer vos adresses de livraison.',
    points: ['Commande et suivi en ligne', 'Adresse et téléphone enregistrés', 'Favoris et boutiques suivies'], cta: 'Je suis client', dark: false,
  },
  {
    href: '/inscription/vendeur', icon: 'store', title: 'Créer un compte Vendeur',
    text: 'Pour les artisans et créateurs qui souhaitent ouvrir une boutique, après validation par notre équipe.',
    points: ['Profil boutique et WhatsApp', "Validation par l'administration", 'Gestion des produits et commandes'], cta: 'Je suis vendeur', dark: true,
  },
];

/** Erreurs par champ renvoyées par le serveur (ex. « Un compte avec cet email existe déjà » sur email) */
function serverFieldErrors(error: unknown): Record<string, string> {
  return (error as { data?: { fieldErrors?: Record<string, string> | null } } | null)?.data?.fieldErrors ?? {};
}

/**
 * /inscription (choix), /inscription/client, /inscription/vendeur — comme le site React.
 * Validation avec les schémas partagés (mêmes messages que le serveur), puis auth.registerCustomer / registerVendor.
 */
@Component({
  selector: 'app-register-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, NgTemplateOutlet, IconComponent],
  templateUrl: './register.page.html',
  styleUrl: './register.page.css',
})
export class RegisterPage {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  /** Donnée de route : quel écran afficher */
  readonly mode = input<Mode>('choice');

  readonly choices = CHOICES;
  readonly clientFields = CLIENT_FIELDS;
  readonly vendorPerson = VENDOR_PERSON;
  readonly vendorShop = VENDOR_SHOP;
  readonly termsPath = VENDOR_TERMS_PATH;

  readonly form = new FormGroup({
    lastName: new FormControl('', { nonNullable: true }),
    firstName: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true }),
    phone: new FormControl('', { nonNullable: true }),
    city: new FormControl('', { nonNullable: true }),
    address: new FormControl('', { nonNullable: true }),
    shopName: new FormControl('', { nonNullable: true }),
    whatsapp: new FormControl('', { nonNullable: true }),
    password: new FormControl('', { nonNullable: true }),
    passwordConfirm: new FormControl('', { nonNullable: true }),
    acceptTerms: new FormControl(false, { nonNullable: true }),
  });
  readonly errors = signal<Record<string, string>>({});
  readonly formError = signal('');
  readonly sending = signal(false);
  readonly showPassword = signal(false);
  readonly accountTarget = computed(() => {
    const role = this.auth.user()?.role;
    return role === 'admin' ? { href: '/admin', label: 'Administration' } : role === 'vendor' ? { href: '/espace-vendeur', label: 'Mon espace vendeur' } : { href: '/espace-client', label: 'Mon espace client' };
  });

  async submit() {
    this.formError.set('');
    const v = this.form.getRawValue();
    const vendor = this.mode() === 'vendor';
    const values = vendor
      ? { lastName: v.lastName, firstName: v.firstName, email: v.email, phone: v.phone, city: v.city, shopName: v.shopName, whatsapp: v.whatsapp, password: v.password, passwordConfirm: v.passwordConfirm, acceptTerms: v.acceptTerms }
      : { lastName: v.lastName, firstName: v.firstName, email: v.email, phone: v.phone, city: v.city, address: v.address, password: v.password, passwordConfirm: v.passwordConfirm };
    const parsed = vendor ? vendorRegistrationSchema.safeParse(values) : customerRegistrationSchema.safeParse(values);
    if (!parsed.success) {
      this.errors.set(fieldErrors(parsed.error));
      this.formError.set('Certains champs sont à corriger.');
      return;
    }
    this.errors.set({});
    this.sending.set(true);
    try {
      if (vendor) {
        await this.auth.registerVendor(parsed.data as never);
        this.toast.show("Demande vendeur envoyée : votre boutique est en attente de validation par l'administration.", 'succes');
        await this.router.navigateByUrl('/espace-vendeur');
      } else {
        const result = await this.auth.registerCustomer(parsed.data as never);
        this.toast.show(`Compte Client créé. Bienvenue ${result.user.firstName ?? ''} !`, 'succes');
        await this.router.navigateByUrl('/espace-client');
      }
    } catch (error) {
      this.errors.set(serverFieldErrors(error));
      this.formError.set(error instanceof Error && error.message ? error.message : 'Impossible de créer le compte. Réessayez.');
    } finally {
      this.sending.set(false);
    }
  }
}
