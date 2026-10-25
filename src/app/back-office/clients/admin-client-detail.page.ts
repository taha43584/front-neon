import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService, ClientDetail } from '../../core/services/admin.service';
import { PrixDtPipe } from '../../shared/pipes/prix-dt.pipe';
import { AdminState } from '../admin.state';
import { ConfirmDialogComponent, ConfirmRequest, StatusBadgeComponent } from '../admin-ui';

/** Fiche client : profil, adresses, historique des commandes, suspension / réactivation du compte */
@Component({
  selector: 'app-admin-client-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, PrixDtPipe, StatusBadgeComponent, ConfirmDialogComponent],
  templateUrl: './admin-client-detail.page.html',
  styleUrl: '../admin.css',
})
export class AdminClientDetailPage {
  private readonly admin = inject(AdminService);
  private readonly state = inject(AdminState);

  /** Paramètre :id de l'adresse, reçu directement comme entrée (withComponentInputBinding) */
  readonly id = input.required<string>();
  readonly data = signal<ClientDetail | null>(null);
  readonly status = signal<'loading' | 'ok' | 'error'>('loading');
  readonly error = signal('');
  readonly message = signal('');

  readonly confirm = signal<'suspend' | 'unsuspend' | null>(null);
  readonly busy = signal(false);
  readonly actionError = signal('');

  readonly fullName = computed(() => {
    const u = this.data()?.user;
    return u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || 'Sans nom' : '';
  });

  readonly request = computed<ConfirmRequest | null>(() => {
    const action = this.confirm();
    if (!action) return null;
    return action === 'suspend'
      ? { title: `Suspendre ${this.fullName()} ?`, description: 'Le client sera immédiatement déconnecté et ne pourra plus se connecter ni commander. Ses commandes et données sont conservées.', confirmLabel: 'Suspendre', danger: true }
      : { title: `Réactiver ${this.fullName()} ?`, description: 'Le client pourra de nouveau se connecter et commander.', confirmLabel: 'Réactiver' };
  });

  constructor() {
    // Nouvel identifiant dans l'adresse → nouvelle fiche
    effect(() => void this.load(Number(this.id())));
  }

  async load(userId: number) {
    try {
      this.data.set(await this.admin.client(userId));
      this.status.set('ok');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Client introuvable');
      this.status.set('error');
    }
  }

  async apply() {
    const user = this.data()?.user;
    const action = this.confirm();
    if (!user || !action) return;
    this.busy.set(true);
    this.actionError.set('');
    try {
      if (action === 'suspend') await this.admin.suspendUser(user.id);
      else await this.admin.unsuspendUser(user.id);
      this.message.set(action === 'suspend' ? 'Compte suspendu : le client ne peut plus se connecter' : 'Compte réactivé');
      this.confirm.set(null);
      await this.load(user.id);
      void this.state.reload();
    } catch (e) {
      this.actionError.set(e instanceof Error ? e.message : 'Action impossible');
    } finally {
      this.busy.set(false);
    }
  }
}
