import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { inject } from '@angular/core';
import { AdminService, ClientList } from '../../core/services/admin.service';
import { PrixDtPipe } from '../../shared/pipes/prix-dt.pipe';
import { AdminPaginationComponent, StatusBadgeComponent, serverList } from '../admin-ui';
import { IconComponent } from '../../shared/components/icon/icon.component';

type Row = ClientList['items'][number];

/** Clients : filtre (tous / actifs / suspendus), recherche, pagination serveur ; « Créer un compte » mène à /admin/comptes */
@Component({
  selector: 'app-admin-clients-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, PrixDtPipe, StatusBadgeComponent, AdminPaginationComponent, IconComponent],
  templateUrl: './admin-clients.page.html',
  styleUrl: '../admin.css',
})
export class AdminClientsPage {
  private readonly admin = inject(AdminService);

  readonly status = signal<'all' | 'active' | 'suspended'>('all');
  readonly search = signal('');
  readonly page = signal(1);
  readonly tabs = [{ value: 'all', label: 'Tous' }, { value: 'active', label: 'Actifs' }, { value: 'suspended', label: 'Suspendus' }] as const;

  readonly list = serverList(
    computed(() => ({ status: this.status(), search: this.search().trim() || undefined, page: this.page() })),
    (f) => this.admin.clients(f),
  );

  readonly rows = computed(() => this.list.data()?.items ?? []);

  fullName(r: Row) {
    return [r.firstName, r.lastName].filter(Boolean).join(' ') || r.name || 'Sans nom';
  }

  /** Un nouveau filtre ramène à la page 1 */
  setStatus(value: 'all' | 'active' | 'suspended') { this.status.set(value); this.page.set(1); }
  setSearch(value: string) { this.search.set(value); this.page.set(1); }
}
