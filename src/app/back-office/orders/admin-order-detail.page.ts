import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService, ORDER_STATUS_OPTIONS, OrderDetail, OrderStatus, STATUS_LABELS } from '../../core/services/admin.service';
import { PrixDtPipe } from '../../shared/pipes/prix-dt.pipe';
import { NeonOrderPreviewComponent, OrderedNeon } from '../../shared/components/neon/neon-order-preview.component';
import { AdminState } from '../admin.state';
import { ConfirmDialogComponent, ConfirmRequest, StatusBadgeComponent } from '../admin-ui';

type Item = OrderDetail['items'][number];

/**
 * Fiche commande : articles regroupés par boutique (prix ENREGISTRÉS à la commande), historique des statuts,
 * client et livraison, commissions ; changement de statut de toute la commande avec note interne.
 */
@Component({
  selector: 'app-admin-order-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, PrixDtPipe, StatusBadgeComponent, ConfirmDialogComponent, NeonOrderPreviewComponent],
  templateUrl: './admin-order-detail.page.html',
  styleUrls: ['../admin.css', './admin-order-detail.page.css'],
})
export class AdminOrderDetailPage {
  private readonly admin = inject(AdminService);
  private readonly state = inject(AdminState);

  readonly id = input.required<string>();
  readonly data = signal<OrderDetail | null>(null);
  readonly status = signal<'loading' | 'ok' | 'error'>('loading');
  readonly error = signal('');
  readonly message = signal('');
  readonly labels = STATUS_LABELS;

  readonly options = computed(() => ORDER_STATUS_OPTIONS.filter((o) => o.value !== this.data()?.order.status));
  /** Articles regroupés par boutique */
  readonly byShop = computed(() => {
    const groups = new Map<string, Item[]>();
    for (const item of this.data()?.items ?? []) groups.set(item.shopName, [...(groups.get(item.shopName) ?? []), item]);
    return Array.from(groups.entries()).map(([shopName, items]) => ({ shopName, items }));
  });

  readonly next = signal<OrderStatus | null>(null);
  readonly busy = signal(false);
  readonly actionError = signal('');
  readonly request = computed<ConfirmRequest | null>(() => {
    const s = this.next();
    if (!s) return null;
    return {
      title: `Passer la commande en « ${STATUS_LABELS[s]} » ?`,
      description: s === 'cancelled'
        ? 'Tous les articles de toutes les boutiques seront annulés et les commissions associées marquées comme annulées. Les quantités sont réintégrées au stock des produits concernés.'
        : "Le statut s'applique à la commande entière, pour toutes les boutiques concernées.",
      confirmLabel: 'Confirmer', danger: s === 'cancelled', reason: true,
      reasonPlaceholder: "Note interne (facultative), conservée dans l'historique",
    };
  });

  constructor() {
    effect(() => void this.load(Number(this.id())));
  }

  async load(orderId: number) {
    try {
      this.data.set(await this.admin.order(orderId));
      this.status.set('ok');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Commande introuvable');
      this.status.set('error');
    }
  }

  choose(event: Event) {
    const select = event.target as HTMLSelectElement;
    const value = select.value as OrderStatus | '';
    select.value = '';
    if (value) {
      this.actionError.set('');
      this.next.set(value);
    }
  }

  async apply(note: string) {
    const order = this.data()?.order;
    const s = this.next();
    if (!order || !s) return;
    this.busy.set(true);
    try {
      await this.admin.updateOrderStatus(order.id, s, note || undefined);
      this.message.set('Statut de la commande mis à jour');
      this.next.set(null);
      await this.load(order.id);
      void this.state.reload();
    } catch (e) {
      this.actionError.set(e instanceof Error ? e.message : 'Mise à jour impossible');
    } finally {
      this.busy.set(false);
    }
  }

  neonOf(item: Item): OrderedNeon | null {
    return (item as { neon?: OrderedNeon | null }).neon ?? null;
  }

  details(item: Item) {
    return [item.selectedColor, item.personalization].filter(Boolean).join(' · ');
  }

  author(h: OrderDetail['history'][number]) {
    return (h.changedByRole === 'admin' ? 'Administration' : `Vendeur ${h.shopName ?? ''}`) + (h.userName ? ` (${h.userName})` : '');
  }

  commissionStatus(status: string) {
    return status === 'pending' ? 'à régler' : status === 'settled' ? 'réglée' : 'annulée';
  }
}
