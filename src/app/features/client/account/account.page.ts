import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
// Règles de validation PARTAGÉES avec le serveur et le site React (importées, pas recopiées)
import { fieldErrors, profileUpdateSchema } from '@shared/validation';
import { AuthService } from '../../../core/services/auth.service';
import { AccountService, ClientDashboard, ClientOrder, OrderDetail, orderReference, orderStatusLabel } from '../../../core/services/account.service';
import { PrixDtPipe } from '../../../shared/pipes/prix-dt.pipe';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ReviewableLine, ReviewsService } from '../../../core/services/reviews.service';
import { ToastService } from '../../../core/services/toast.service';
import { ThemeChoiceComponent } from '../../../shared/components/theme-choice/theme-choice.component';
import { ReviewFormDialogComponent } from './review-form-dialog.component';

type ProfileField = 'lastName' | 'firstName' | 'phone' | 'city' | 'address';

/**
 * Espace client (/espace-client, protégé par authGuard) : profil, compteurs, commandes avec détail et statut.
 * Réservé aux comptes Client ; un vendeur ou un admin voit un message qui l'oriente.
 */
@Component({
  selector: 'app-account-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, DatePipe, PrixDtPipe, IconComponent, ReviewFormDialogComponent, ThemeChoiceComponent],
  templateUrl: './account.page.html',
  styleUrl: './account.page.css',
})
export class AccountPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly account = inject(AccountService);

  /** /favoris : donnée de route focus = 'favorites' (section mise en avant et affichée à l'écran) */
  readonly focus = input<'favorites' | undefined>();

  readonly status = signal<'loading' | 'ok' | 'error'>('loading');
  readonly dashboard = signal<ClientDashboard | null>(null);
  readonly statusLabel = orderStatusLabel;
  readonly reference = orderReference;

  // ----- Détail d'une commande (chargé à l'ouverture) -----
  readonly openOrderId = signal<number | null>(null);
  readonly details = signal<Record<number, OrderDetail | 'loading' | 'error'>>({});

  // ----- Profil -----
  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly profileErrors = signal<Partial<Record<ProfileField, string>>>({});
  readonly profileMessage = signal('');
  readonly profileForm = new FormGroup({
    lastName: new FormControl('', { nonNullable: true }),
    firstName: new FormControl('', { nonNullable: true }),
    phone: new FormControl('', { nonNullable: true }),
    city: new FormControl('', { nonNullable: true }),
    address: new FormControl('', { nonNullable: true }),
  });
  readonly profileFields: { name: ProfileField; label: string; wide?: boolean }[] = [
    { name: 'lastName', label: 'Nom' },
    { name: 'firstName', label: 'Prénom' },
    { name: 'phone', label: 'Téléphone' },
    { name: 'city', label: 'Ville / Localisation' },
    { name: 'address', label: 'Adresse de livraison', wide: true },
  ];

  // ----- Adresses de livraison (mêmes limites que le serveur) -----
  readonly addressFormOpen = signal(false);
  readonly addressSaving = signal(false);
  readonly addressError = signal('');
  readonly addressForm = new FormGroup({
    label: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(64)] }),
    recipientName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2), Validators.maxLength(191)] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6), Validators.maxLength(64)] }),
    city: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2), Validators.maxLength(128)] }),
    addressLine: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(5), Validators.maxLength(2000)] }),
    postalCode: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(32)] }),
    isDefault: new FormControl(false, { nonNullable: true }),
  });

  toggleAddressForm() {
    this.addressError.set('');
    this.addressFormOpen.update((v) => !v);
  }

  async saveAddress() {
    if (this.addressForm.invalid) {
      return this.addressError.set('Renseignez le libellé, le destinataire, le téléphone (6 caractères au moins), la ville et l\'adresse complète (5 caractères au moins).');
    }
    const v = this.addressForm.getRawValue();
    this.addressSaving.set(true);
    this.addressError.set('');
    try {
      await this.account.addAddress({ label: v.label.trim(), recipientName: v.recipientName.trim(), phone: v.phone.trim(), city: v.city.trim(), addressLine: v.addressLine.trim(), postalCode: v.postalCode.trim() || undefined, isDefault: v.isDefault });
      this.addressForm.reset();
      this.addressFormOpen.set(false);
      await this.reloadQuietly();
    } catch (e) {
      this.addressError.set(e instanceof Error ? e.message : "L'adresse n'a pas pu être enregistrée.");
    } finally {
      this.addressSaving.set(false);
    }
  }

  async removeAddress(id: number) {
    try {
      await this.account.deleteAddress(id);
      await this.reloadQuietly();
    } catch {
      this.addressError.set("L'adresse n'a pas pu être supprimée.");
    }
  }

  // ----- Avis (A-10c) : une ligne livrée = un avis, dans la fenêtre « Donner mon avis » -----
  private readonly reviewsApi = inject(ReviewsService);
  private readonly toast = inject(ToastService);
  private readonly reviewDialog = viewChild.required(ReviewFormDialogComponent);
  readonly reviewableLines = signal<ReviewableLine[]>([]);
  /** Ligne de commande → ligne à évaluer (bouton dans le détail des commandes) */
  readonly reviewableById = computed(() => new Map(this.reviewableLines().map((l) => [l.orderItemId, l])));
  private async loadReviewable() {
    this.reviewableLines.set(await this.reviewsApi.reviewableLines().catch(() => []));
  }
  openReview(line: ReviewableLine) {
    this.reviewDialog().open(line);
  }
  async onReviewSent() {
    this.toast.show('Merci ! Votre avis sera publié après vérification par notre équipe.', 'succes');
    await Promise.all([this.reloadQuietly(), this.loadReviewable()]);
  }
  /** Mêmes libellés que le site React */
  reviewStatusLabel(status: string) {
    return status === 'pending' ? 'En modération' : status === 'published' ? 'Publié' : 'Non visible';
  }
  stars(n: number) {
    return '★'.repeat(n);
  }

  ngOnInit() {
    if (this.auth.isCustomer()) void this.load();
  }

  /** Après une action : données relues sans repasser par l'état « Chargement » (la page ne saute pas) */
  private async reloadQuietly() {
    this.dashboard.set(await this.account.dashboard());
  }

  async load() {
    this.status.set('loading');
    try {
      const [dashboard] = await Promise.all([this.account.dashboard(), this.loadReviewable()]);
      this.dashboard.set(dashboard);
      this.status.set('ok');
      // /favoris : une fois la section affichée, on la fait venir à l'écran
      if (this.focus() === 'favorites') setTimeout(() => document.getElementById('favoris')?.scrollIntoView({ block: 'start' }));
    } catch {
      this.status.set('error');
    }
  }

  /** Ouvre / ferme le détail d'une commande ; le détail n'est demandé au serveur qu'une fois */
  async toggleOrder(order: ClientOrder) {
    if (this.openOrderId() === order.id) {
      this.openOrderId.set(null);
      return;
    }
    this.openOrderId.set(order.id);
    if (this.details()[order.id] && this.details()[order.id] !== 'error') return;
    this.details.update((d) => ({ ...d, [order.id]: 'loading' }));
    try {
      const detail = await this.account.order(order.id);
      this.details.update((d) => ({ ...d, [order.id]: detail ?? 'error' }));
    } catch {
      this.details.update((d) => ({ ...d, [order.id]: 'error' }));
    }
  }

  detailOf(orderId: number) {
    const value = this.details()[orderId];
    return typeof value === 'object' ? value : null;
  }

  startEditing() {
    const user = this.auth.user();
    this.profileForm.setValue({
      lastName: user?.lastName ?? '', firstName: user?.firstName ?? '', phone: user?.phone ?? '', city: user?.city ?? '', address: user?.address ?? '',
    });
    this.profileErrors.set({});
    this.profileMessage.set('');
    this.editing.set(true);
  }

  async saveProfile() {
    // Même schéma que le serveur : mêmes règles et mêmes messages d'erreur, sans les recopier
    const parsed = profileUpdateSchema.safeParse(this.profileForm.getRawValue());
    if (!parsed.success) {
      this.profileErrors.set(fieldErrors(parsed.error));
      return;
    }
    this.saving.set(true);
    try {
      await this.account.updateProfile(parsed.data);
      await this.auth.refresh(); // l'en-tête et le profil affichent les nouvelles informations
      this.editing.set(false);
      this.profileMessage.set('Informations mises à jour');
    } catch (error) {
      this.profileErrors.set({ address: error instanceof Error ? error.message : "Impossible d'enregistrer vos informations" });
    } finally {
      this.saving.set(false);
    }
  }
}
