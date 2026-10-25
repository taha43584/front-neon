import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AccountRow, AdminService } from '../../core/services/admin.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { AdminDialogComponent } from '../admin-ui';

type RoleFilter = 'user' | 'vendor' | 'admin' | undefined;

const ROLE_LABELS: Record<string, string> = { user: 'Client', vendor: 'Vendeur', admin: 'Admin' };

/**
 * /admin/comptes : créer un compte (client ou vendeur avec boutique approuvée), lister, suspendre / réactiver,
 * comme la page React (procédures admin.createUser, listUsers, suspendUser, unsuspendUser).
 * Le mot de passe, s'il n'est pas saisi, est généré par le serveur et affiché une fois (il est aussi envoyé par e-mail).
 */
@Component({
  selector: 'app-admin-accounts-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ReactiveFormsModule, RouterLink, IconComponent, AdminDialogComponent],
  templateUrl: './admin-accounts.page.html',
  styleUrls: ['../admin.css', './admin-accounts.page.css'],
})
export class AdminAccountsPage {
  private readonly admin = inject(AdminService);

  readonly filters: { value: RoleFilter; label: string }[] = [
    { value: undefined, label: 'Tous' }, { value: 'user', label: 'Clients' }, { value: 'vendor', label: 'Vendeurs' }, { value: 'admin', label: 'Admins' },
  ];
  readonly roleLabels = ROLE_LABELS;
  readonly role = signal<RoleFilter>(undefined);
  readonly status = signal<'loading' | 'ok' | 'error'>('loading');
  readonly error = signal('');
  readonly accounts = signal<AccountRow[]>([]);
  readonly busyId = signal<number | null>(null);
  readonly message = signal('');
  readonly actionError = signal('');

  readonly counts = computed(() => {
    const list = this.accounts();
    return { total: list.length, vendors: list.filter((a) => a.role === 'vendor').length, suspended: list.filter((a) => a.suspended).length };
  });

  // ----- Création d'un compte -----
  readonly creating = signal(false);
  readonly newRole = signal<'customer' | 'seller'>('customer');
  readonly createBusy = signal(false);
  readonly createError = signal('');
  readonly generatedPassword = signal<string | null>(null);
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true }),
    phone: new FormControl('', { nonNullable: true }),
    password: new FormControl('', { nonNullable: true }),
    shopName: new FormControl('', { nonNullable: true }),
    shopDescription: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      const role = this.role();
      untracked(() => void this.load(role));
    });
  }

  async load(role = this.role()) {
    try {
      this.accounts.set(await this.admin.listUsers(role));
      this.status.set('ok');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Comptes indisponibles');
      this.status.set('error');
    }
  }

  async toggleSuspend(a: AccountRow) {
    this.busyId.set(a.id);
    this.actionError.set('');
    try {
      if (a.suspended) await this.admin.unsuspendUser(a.id);
      else await this.admin.suspendUser(a.id);
      await this.load();
      this.message.set(a.suspended ? 'Compte réactivé' : 'Compte suspendu');
    } catch (e) {
      this.actionError.set(e instanceof Error ? e.message : 'Action impossible');
    } finally {
      this.busyId.set(null);
    }
  }

  openCreate() {
    this.form.reset();
    this.newRole.set('customer');
    this.createError.set('');
    this.generatedPassword.set(null);
    this.creating.set(true);
  }

  closeCreate() {
    this.creating.set(false);
    this.generatedPassword.set(null);
  }

  async create() {
    const v = this.form.getRawValue();
    const seller = this.newRole() === 'seller';
    // Contrôles simples avant l'envoi (le serveur revérifie tout)
    if (v.name.trim().length < 2) return this.createError.set('Le nom complet doit comporter au moins 2 caractères.');
    if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) return this.createError.set('Adresse e-mail invalide.');
    if (v.password && v.password.trim().length < 8) return this.createError.set('Le mot de passe doit comporter au moins 8 caractères (ou laissez le champ vide).');
    if (seller && v.shopName.trim().length < 2) return this.createError.set('Le nom de la boutique est requis pour un vendeur');
    this.createBusy.set(true);
    this.createError.set('');
    try {
      const r = await this.admin.createUser({
        name: v.name.trim(), email: v.email.trim(), phone: v.phone.trim() || undefined,
        password: v.password.trim().length >= 8 ? v.password.trim() : undefined, role: this.newRole(),
        shopName: seller ? v.shopName.trim() || undefined : undefined,
        shopDescription: seller ? v.shopDescription.trim() || undefined : undefined,
      });
      this.generatedPassword.set(r.plainPassword);
      this.message.set('Compte créé avec succès');
      await this.load();
    } catch (e) {
      this.createError.set(e instanceof Error && e.message ? e.message : 'Impossible de créer le compte');
    } finally {
      this.createBusy.set(false);
    }
  }
}
