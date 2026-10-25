import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService, VendorDetail } from '../../core/services/admin.service';
import { PrixDtPipe } from '../../shared/pipes/prix-dt.pipe';
import { AdminState } from '../admin.state';
import { ConfirmDialogComponent, StatusBadgeComponent } from '../admin-ui';
import { ShopAction, shopActionDone, shopActionRequest } from './shop-status-action';

/** Fiche vendeur : informations, chiffres, produits, commandes ; mêmes actions de statut que la liste */
@Component({
  selector: 'app-admin-vendor-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, PrixDtPipe, StatusBadgeComponent, ConfirmDialogComponent],
  templateUrl: './admin-vendor-detail.page.html',
  styleUrl: '../admin.css',
})
export class AdminVendorDetailPage {
  private readonly admin = inject(AdminService);
  private readonly state = inject(AdminState);

  readonly id = input.required<string>();
  readonly data = signal<VendorDetail | null>(null);
  readonly status = signal<'loading' | 'ok' | 'error'>('loading');
  readonly error = signal('');
  readonly message = signal('');

  readonly action = signal<ShopAction | null>(null);
  readonly request = computed(() => shopActionRequest(this.action()));
  readonly busy = signal(false);
  readonly actionError = signal('');

  /** Compte du vendeur : peut manquer (compte supprimé), même si le type déduit ne le dit pas */
  readonly owner = computed(() => (this.data()?.owner ?? null) as VendorDetail['owner'] | null);
  readonly ownerName = computed(() => {
    const o = this.owner();
    return o ? [o.firstName, o.lastName].filter(Boolean).join(' ') || o.name : null;
  });

  readonly place = computed(() => {
    const shop = this.data()?.shop;
    return shop ? [shop.city, shop.address].filter(Boolean).join(' · ') : '';
  });

  constructor() {
    effect(() => void this.load(Number(this.id())));
  }

  async load(shopId: number) {
    try {
      this.data.set(await this.admin.vendor(shopId));
      this.status.set('ok');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Boutique introuvable');
      this.status.set('error');
    }
  }

  ask(status: ShopAction['status']) {
    const shop = this.data()?.shop;
    if (!shop) return;
    this.actionError.set('');
    this.action.set({ shopId: shop.id, shopName: shop.name, status });
  }

  async apply(reason: string) {
    const a = this.action();
    if (!a) return;
    this.busy.set(true);
    try {
      await this.admin.updateShopStatus(a.shopId, a.status, reason || undefined);
      this.message.set(shopActionDone(a.status));
      this.action.set(null);
      await this.load(a.shopId);
      void this.state.reload();
    } catch (e) {
      this.actionError.set(e instanceof Error ? e.message : 'Action impossible');
    } finally {
      this.busy.set(false);
    }
  }
}
