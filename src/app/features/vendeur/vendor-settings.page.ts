import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ThemeChoiceComponent } from '../../shared/components/theme-choice/theme-choice.component';
// Mêmes règles que le serveur (importées, pas recopiées)
import { fieldErrors, profileUpdateSchema } from '@shared/validation';
import { AccountService } from '../../core/services/account.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { VendorService } from '../../core/services/vendor.service';
import { VendorSpaceState } from './vendor-space.state';

type Field = 'lastName' | 'firstName' | 'phone' | 'city' | 'address';

/**
 * /espace-vendeur/parametres, comme React : coordonnées publiques (afficher WhatsApp / téléphone),
 * statut de la boutique, compte du responsable (account.updateProfile).
 */
@Component({
  selector: 'app-vendor-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ReactiveFormsModule, ThemeChoiceComponent],
  template: `
    <div class="titre-page"><div><h1>Paramètres</h1><p>Compte du responsable de la boutique et confidentialité.</p></div></div>
    @if (state.shop(); as shop) {
      <div class="grille">
        <section class="bloc">
          <div class="titre-bloc"><h2>Coordonnées publiques</h2></div>
          <div class="interrupteurs">
            <label class="ligne-interrupteur">
              <span><span class="fort">Afficher mon WhatsApp</span><span class="petit bloc-texte">{{ shop.whatsapp || 'Aucun numéro WhatsApp renseigné' }}</span></span>
              <input type="checkbox" role="switch" class="interrupteur" [checked]="shop.showWhatsapp === 1" [disabled]="!shop.whatsapp || busy()" (change)="setVisibility('showWhatsapp', $any($event.target).checked)" aria-label="Afficher le WhatsApp sur la page publique" data-testid="toggle-whatsapp" />
            </label>
            <label class="ligne-interrupteur">
              <span><span class="fort">Afficher mon téléphone</span><span class="petit bloc-texte">{{ shop.phone || 'Aucun téléphone renseigné' }}</span></span>
              <input type="checkbox" role="switch" class="interrupteur" [checked]="shop.showPhone === 1" [disabled]="!shop.phone || busy()" (change)="setVisibility('showPhone', $any($event.target).checked)" aria-label="Afficher le téléphone sur la page publique" data-testid="toggle-phone" />
            </label>
            <p class="petit">Votre adresse et votre e-mail ne sont jamais publiés. Les clients peuvent toujours vous écrire via la messagerie.</p>
          </div>
        </section>

        <!-- A-10e : apparence de l'espace sur CET appareil -->
        <section class="bloc" aria-label="Apparence"><app-theme-choice /></section>

        <section class="bloc">
          <div class="titre-bloc"><h2>Statut de la boutique</h2></div>
          <dl class="statut-liste">
            <div><dt>Statut</dt><dd class="vert">Approuvée par l'administration</dd></div>
            <div><dt>Adresse de la page</dt><dd><code>/boutique/{{ shop.slug }}</code></dd></div>
            <div><dt>Conditions vendeur acceptées</dt><dd>{{ shop.termsVersion ? 'Version ' + shop.termsVersion : '—' }}@if (shop.termsVersion && shop.termsAcceptedAt) { · {{ shop.termsAcceptedAt | date: 'd MMM y' }}}</dd></div>
            <div><dt>Mot de passe</dt><dd>Utilisez « Mot de passe oublié » sur l'écran de connexion pour le changer.</dd></div>
          </dl>
        </section>

        <section class="bloc large">
          <div class="titre-bloc"><h2>Compte du responsable</h2></div>
          <form [formGroup]="form" (ngSubmit)="save()" novalidate class="form-compte" data-testid="vendor-profile-form">
            @for (f of fields; track f.name) {
              <label [class.pleine]="f.name === 'address'">{{ f.label }}
                <input class="champ" [formControlName]="f.name" [attr.aria-invalid]="!!errors()[f.name]" />
                @if (errors()[f.name]) { <span class="erreur">{{ errors()[f.name] }}</span> }
              </label>
            }
            <p class="petit pleine">E-mail de connexion : {{ auth.user()?.email }} (non modifiable ici).</p>
            <div class="pleine"><button type="submit" class="bouton petit" [disabled]="saving()">{{ saving() ? 'Enregistrement…' : 'Enregistrer' }}</button></div>
          </form>
        </section>
      </div>
    }
  `,
  styleUrls: ['./vendor-pages.css'],
  styles: `
    .grille { display: grid; gap: 24px; }
    .interrupteurs { display: grid; gap: 16px; margin-top: 16px; font-size: 14px; }
    .ligne-interrupteur { display: flex; min-height: 44px; align-items: center; justify-content: space-between; gap: 16px; cursor: pointer; }
    .fort { font-weight: 500; }
    .bloc-texte { display: block; }
    .interrupteur { position: relative; width: 44px; height: 24px; flex-shrink: 0; margin: 0; border-radius: 999px; background: var(--ligne-34, #d9cfc6); appearance: none; cursor: pointer; transition: background .2s; }
    .interrupteur::after { content: ""; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 999px; background: var(--carte); box-shadow: 0 1px 2px rgba(0, 0, 0, .2); transition: transform .2s; }
    .interrupteur:checked { background: var(--encre-9, #302a26); }
    .interrupteur:checked::after { transform: translateX(20px); }
    .interrupteur:disabled { opacity: .5; cursor: not-allowed; }
    .interrupteur:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .statut-liste { display: grid; gap: 12px; margin: 16px 0 0; font-size: 14px; }
    dt { color: var(--gris-11, #7c6d64); font-size: 12px; }
    dd { margin: 0; }
    .vert { color: var(--vert-7, #2e7d32); font-weight: 600; }
    code { padding: 2px 6px; border-radius: 4px; background: var(--surface-10, #fbf8f4); font-size: 12px; }
    .form-compte { display: grid; gap: 16px; margin-top: 16px; }
    .form-compte label { display: grid; gap: 4px; color: var(--gris-22, #6e5d53); font-size: 12px; font-weight: 600; }
    .form-compte .champ { width: 100%; }
    .erreur { color: var(--rouge-11, #c0392b); font-weight: 400; }
    @media (min-width: 640px) { .form-compte { grid-template-columns: 1fr 1fr; } .pleine { grid-column: 1 / -1; } }
    @media (min-width: 1024px) { .grille { grid-template-columns: 1fr 1fr; } .large { grid-column: 1 / -1; } }
  `,
})
export class VendorSettingsPage {
  readonly state = inject(VendorSpaceState);
  readonly auth = inject(AuthService);
  private readonly vendor = inject(VendorService);
  private readonly account = inject(AccountService);
  private readonly toast = inject(ToastService);

  readonly fields: { name: Field; label: string }[] = [
    { name: 'lastName', label: 'Nom' }, { name: 'firstName', label: 'Prénom' }, { name: 'phone', label: 'Téléphone' },
    { name: 'city', label: 'Ville' }, { name: 'address', label: 'Adresse' },
  ];
  readonly form = new FormGroup({
    lastName: new FormControl('', { nonNullable: true }),
    firstName: new FormControl('', { nonNullable: true }),
    phone: new FormControl('', { nonNullable: true }),
    city: new FormControl('', { nonNullable: true }),
    address: new FormControl('', { nonNullable: true }),
  });
  readonly errors = signal<Partial<Record<Field, string>>>({});
  readonly busy = signal(false);
  readonly saving = signal(false);

  constructor() {
    const u = this.auth.user();
    this.form.setValue({ lastName: u?.lastName ?? '', firstName: u?.firstName ?? '', phone: u?.phone ?? '', city: u?.city ?? '', address: u?.address ?? '' });
  }

  async setVisibility(key: 'showWhatsapp' | 'showPhone', value: boolean) {
    this.busy.set(true);
    try {
      await this.vendor.updateShop({ [key]: value });
      this.toast.show('Visibilité mise à jour', 'succes');
      await this.state.reload();
    } catch (e) {
      this.toast.show(e instanceof Error ? e.message : 'Mise à jour impossible', 'erreur');
      await this.state.reload();
    } finally {
      this.busy.set(false);
    }
  }

  async save() {
    // Champs vides ignorés : seules les valeurs renseignées sont vérifiées et envoyées (en React, un champ vide bloquait l’envoi)
    const raw = this.form.getRawValue();
    const values = Object.fromEntries(Object.entries(raw).filter(([, v]) => v.trim() !== ''));
    const parsed = profileUpdateSchema.safeParse(values);
    if (!parsed.success) return this.errors.set(fieldErrors(parsed.error));
    this.errors.set({});
    this.saving.set(true);
    try {
      await this.account.updateProfile(parsed.data);
      await this.auth.refresh();
      this.toast.show('Informations du compte mises à jour', 'succes');
    } catch (e) {
      this.toast.show(e instanceof Error ? e.message : 'Enregistrement impossible', 'erreur');
    } finally {
      this.saving.set(false);
    }
  }
}
